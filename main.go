package main

// packages
import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/md5"
	"crypto/rand"
	"crypto/sha1"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	_ "mysql-master"
	"net/http"
	"os"
	"time"
)

type app struct {
	Db   string
	Port string
}

//event
type event struct {
	Id         string `json:"id"`
	Type       string `json:"type"`
	Result     string `json:"result"`
	Done       string `json:"done"`
	Public     string `json:"public"`
	Fixtures   string `json:"fixtures"`
	Managers   string `json:"managers"`
	Created_at string `json:"created_at"`
	Updated_at string `json:"updated_at"`
}

//fixture
type fixture struct {
	Ht int    `json:"ht"`
	At int    `json:"at"`
	Hg int    `json:"hg"`
	Ag int    `json:"ag"`
	Dt string `json:"dt"`
	Ft int    `json:"ft"`
}

//managers
type manager struct {
	Mg string `json:"m"`
	Tm int    `json:"t"`
}

// user
type user struct {
	Name            string    `json:"name"`
	Password_digest string    `json:"digest"`
	Email           string    `json:"email"`
	Auth            [3]string `json:"auth"`
	Created_at      string    `json:"created_at"`
	Form            string    `json:"form"`
}

// genrate keys
func (u *user) genKeys() {
	u.Password_digest = encode(time.Now().String())
	u.Auth[0], _ = encrypt([]byte(u.Auth[0]), []byte(u.Password_digest[:32]))
	u.Auth[1], _ = encrypt([]byte(u.Email), []byte(u.Password_digest[:32]))
	u.Auth[2] = u.Password_digest
}

// authorize user access
func (u *user) authAccess(req *http.Request) bool {
	cookie, err := req.Cookie("Auth2")
	if err != nil {
		return false
	}
	u.Auth[2] = cookie.Value
	cookie, err = req.Cookie("Auth0")
	if err != nil {
		return false
	}
	if u.Auth[0], err = decrypt(cookie.Value, []byte(u.Auth[2][:32])); err != nil {
		return false
	}
	cookie, err = req.Cookie("Auth1")
	if err != nil {
		return false
	}
	if u.Auth[1], err = decrypt(cookie.Value, []byte(u.Auth[2][:32])); err != nil {
		return false
	}
	return true
}

// fetch events
func (e event) fetchEvents(db *sql.DB, cond string, events chan string) {
	var evnts string = "["
	rows, err := db.Query("SELECT eid,emanagers,etype ,eresult,epublic,edone,eFixtures,ecreated_at , eupdated_at FROM pr_two_events " + cond)
	if err != nil {
		events <- "[]"
		return
	}
	defer rows.Close()
	for rows.Next() {
		rows.Scan(&e.Id, &e.Managers, &e.Type, &e.Result, &e.Public, &e.Done, &e.Fixtures, &e.Created_at, &e.Updated_at)
		evnts += "{\"id\": \"" + e.Id + "\",\"type\": " + e.Type + ",\"created_at\": \"" + e.Created_at + "\",\"managers\": " + e.Managers + ",\"fixtures\": " + e.Fixtures + ",\"result\":\"" + e.Result + "\",\"public\": " + e.Public + ",\"done\": " + e.Done + "},"
	}
	evnts = evnts[0:(len(evnts)-1)] + "]"
	if len(evnts) < 4 {
		evnts = "[]"
	}
	events <- evnts
}

//fetch users
func (u user) fetchUsers(db *sql.DB, users chan string) {
	var usrs string = "["
	rows, err := db.Query("SELECT uname , uemail, uform  FROM pr_two_users;")
	if err != nil {
		users <- "[]"
		return
	}
	defer rows.Close()
	for rows.Next() {
		rows.Scan(&u.Name, &u.Email, &u.Form)
		usrs += "{\"name\": \"" + u.Name + "\",\"email\": \"" + u.Email + "\",\"form\": " + u.Form + "},"
	}
	usrs = usrs[0:(len(usrs)-1)] + "]"
	if len(usrs) < 4 {
		usrs = "[]"
	}
	users <- usrs
}

// main
func main() {
	var a app
	a.Db = os.Getenv("MYSQL_DB")
	a.Port = os.Getenv("PORT")
	if a.Db == "" {
		a.Db = "root:love6226@tcp(localhost:3306)/pr_two_db"
		a.Port = "3000"
	}
	db, _ := sql.Open("mysql", a.Db)
	if db.Ping() != nil {
		log.Fatal("Cannot Connect..")
	}
	mux := http.NewServeMux()
	mux.Handle("/", http.FileServer(http.Dir("static")))

	// user auth
	mux.HandleFunc("/auth/user", func(res http.ResponseWriter, req *http.Request) {
		var u user
		defer req.Body.Close()
		if json.NewDecoder(req.Body).Decode(&u) != nil {
			http.Error(res, "INVREQ", 500)
			return
		}
		if err := db.QueryRow("SELECT uid ,uform, uname , uemail , ucreated_at FROM pr_two_users WHERE uemail = ? AND upassword_digest = ?;", u.Email, encode(u.Password_digest)).Scan(&u.Auth[0], &u.Form, &u.Name, &u.Email, &u.Created_at); err != nil {
			http.Error(res, "NOREQ", 500)
			return
		}
		u.genKeys()
		res.Header().Set("Content-Type", "application/json")
		res.Write([]byte("{\"form\" : " + u.Form + ",\"created_at\": \"" + u.Created_at + "\",\"name\" : \"" + u.Name + "\",\"email\" : \"" + u.Email + "\",\"auth\" : [\"" + u.Auth[0] + "\",\"" + u.Auth[1] + "\",\"" + u.Auth[2] + "\"]}"))
	})

	// user join
	mux.HandleFunc("/join/user", func(res http.ResponseWriter, req *http.Request) {
		var u user
		u.Auth[0] = time.Now().String()
		u.Created_at = u.Auth[0]
		defer req.Body.Close()
		if json.NewDecoder(req.Body).Decode(&u) != nil {
			http.Error(res, "INVREQ", 500)
			return
		}
		u.Auth[0] = u.Auth[0][2:4] + u.Auth[0][5:7] + u.Auth[0][8:10] + u.Auth[0][17:19] + u.Auth[0][20:22]
		stm, _ := db.Prepare("INSERT INTO pr_two_users (uid,uemail , uname , upassword_digest , ucreated_at , uupdated_at) VALUES (? ,?, ?, ?,?,?);")
		defer stm.Close()
		if _, err := stm.Exec(u.Auth[0], u.Email, u.Name, encode(u.Password_digest), time.Now(), time.Now()); err != nil {
			http.Error(res, "NOINS", 500)
			return
		}
		u.genKeys()
		u.Created_at = time.Now().String()
		res.Header().Set("Content-Type", "application/json")
		res.Write([]byte("{\"form\" : " + u.Form + ",\"created_at\": \"" + u.Created_at + "\",\"name\" : \"" + u.Name + "\",\"email\" : \"" + u.Email + "\",\"auth\" : [\"" + u.Auth[0] + "\",\"" + u.Auth[1] + "\",\"" + u.Auth[2] + "\"]}"))
	})

	// all users
	mux.HandleFunc("/fetch/users", func(res http.ResponseWriter, req *http.Request) {
		var u user
		users := make(chan string)
		go u.fetchUsers(db, users)
		res.Header().Set("Content-Type", "application/json")
		res.Write([]byte(<-users))
	})

	//create event
	mux.HandleFunc("/create/event", func(res http.ResponseWriter, req *http.Request) {
		var e event
		var u user
		defer req.Body.Close()
		if json.NewDecoder(req.Body).Decode(&e) != nil {
			http.Error(res, "INVREQ", 500)
			return
		}
		if u.authAccess(req) == false {
			http.Error(res, "NOACS", 500)
			return
		}
		e.Created_at = time.Now().String()
		e.Id = e.Created_at[2:4] + e.Created_at[5:7] + e.Created_at[8:10] + e.Created_at[17:19] + e.Created_at[20:22]
		stm, _ := db.Prepare("INSERT INTO pr_two_events (eid,emanagers,etype ,eresult,efixtures,epublic,ecreated_at , eupdated_at) VALUES (?,?,?,? ,? ,?, ?,?);")
		defer stm.Close()
		if _, err := stm.Exec(e.Id, e.Managers, e.Type, e.Result, "[]", e.Public, time.Now(), time.Now()); err != nil {
			http.Error(res, "NOINS", 500)
			return
		}
		res.Header().Set("Content-Type", "application/json")
		res.Write([]byte("{\"id\": \"" + e.Id + "\",\"managers\": " + e.Managers + ",\"type\": " + e.Type + ",\"created_at\": \"" + e.Created_at[0:19] + "\",\"fixtures\": [],\"result\":\"" + e.Result + "\",\"public\": " + e.Public + ",\"done\": 0}"))
	})

	// fetch single event
	mux.HandleFunc("/fetch/event", func(res http.ResponseWriter, req *http.Request) {
		var e event
		e.Id = req.FormValue("eid")
		if err := db.QueryRow("SELECT etype ,emanagers,eresult,efixtures,epublic,edone,ecreated_at , eupdated_at FROM pr_two_events WHERE eid = ?", e.Id).Scan(&e.Type, &e.Managers, &e.Result, &e.Fixtures, &e.Public, &e.Done, &e.Created_at, &e.Updated_at); err != nil {
			http.Error(res, "NOREQ", 500)
			return
		}
		res.Header().Set("Content-Type", "application/json")
		res.Write([]byte("{\"id\": \"" + e.Id + "\",\"managers\":" + e.Managers + ",\"type\": " + e.Type + ",\"created_at\": \"" + e.Created_at + "\",\"fixtures\": " + e.Fixtures + ",\"result\":\"" + e.Result + "\",\"public\": " + e.Public + ",\"done\": " + e.Done + "}"))
	})

	// all data fetch
	mux.HandleFunc("/fetch/all", func(res http.ResponseWriter, req *http.Request) {
		var u user
		var cond string
		var e event
		users := make(chan string)
		events := make(chan string)
		go u.fetchUsers(db, users)
		if u.authAccess(req) == false {
			cond = "WHERE epublic = 1;"
		} else {
			cond = "WHERE epublic = 1 OR emanagers LIKE '%" + u.Auth[1] + "%';"
		}
		go e.fetchEvents(db, cond, events)
		res.Header().Set("Content-Type", "application/json")
		res.Write([]byte("{\"users\": " + <-users + ",\"events\": " + <-events + "}"))
	})

	// all events
	mux.HandleFunc("/fetch/events", func(res http.ResponseWriter, req *http.Request) {
		var e event
		var cond string
		var u user
		events := make(chan string)
		if u.authAccess(req) == false {
			cond = "WHERE epublic = 1;"
		} else {
			cond = "WHERE epublic = 1 OR emanagers LIKE '%" + u.Auth[1] + "%';"
		}
		go e.fetchEvents(db, cond, events)
		res.Header().Set("Content-Type", "application/json")
		res.Write([]byte(<-events))
	})

	// update event
	mux.HandleFunc("/add/fixture", func(res http.ResponseWriter, req *http.Request) {
		var e event
		var f fixture
		var u user
		defer req.Body.Close()
		if json.NewDecoder(req.Body).Decode(&f) != nil {
			http.Error(res, "INVREQ", 500)
			return
		}
		if u.authAccess(req) == false {
			http.Error(res, "NOACS", 500)
			return
		}
		e.Id = req.FormValue("eid")
		if err := db.QueryRow("SELECT efixtures,emanagers FROM pr_two_events WHERE eid = ?", e.Id).Scan(&e.Fixtures, &e.Managers); err != nil {
			http.Error(res, "NOREQ", 500)
			return
		}
		go func() {
			var fxts []fixture
			var out []byte
			json.Unmarshal([]byte(e.Fixtures), &fxts)
			fxts = append(fxts, f)
			out, _ = json.Marshal(fxts)
			e.Fixtures = string(out)
			stm, _ := db.Prepare("UPDATE pr_two_events SET efixtures = ? , eresult = ? WHERE eid = ? AND emanagers LIKE '%" + u.Auth[1] + "%';")
			defer stm.Close()
			if _, err := stm.Exec(e.Fixtures, req.FormValue("result"), e.Id); err != nil {
				http.Error(res, "NOUPD", 500)
				return
			}
		}()
		go func() {
			won, loss := calculateResult(f)
			if won != -1 {
				var mngrs []manager
				json.Unmarshal([]byte(e.Managers), &mngrs)
				for i := 0; i < len(mngrs); i++ {
					if mngrs[i].Tm == won {
						stm, _ := db.Prepare("UPDATE pr_two_users SET uform = uform + 3  WHERE uemail = ?;")
						_, _ = stm.Exec(mngrs[i].Mg)
						defer stm.Close()
					}
					if mngrs[i].Tm == loss {
						stm, _ := db.Prepare("UPDATE pr_two_users SET uform = uform - 3  WHERE uemail = ?;")
						_, _ = stm.Exec(mngrs[i].Mg)
						defer stm.Close()
					}
				}
			}
		}()
		res.Header().Set("Content-Type", "application/json")
		res.Write([]byte("{\"status\" : \"Updated\"}"))
	})
	log.Fatal(http.ListenAndServe(":"+a.Port, mux))
}

// calculate
func calculateResult(fix fixture) (int, int) {
	if fix.Hg > fix.Ag {
		return fix.Ht, fix.At
	}
	if fix.Hg < fix.Ag {
		return fix.At, fix.Ht
	}
	return -1, -1
}

////////////////////////////////////////////////
func encode(s string) string {
	h := sha1.New()
	h.Write([]byte(s))
	return hex.EncodeToString(h.Sum(nil))
}

///////////////////////////////////////////////////
func getMD5Hash(text string) string {
	hasher := md5.New()
	hasher.Write([]byte(text))
	return hex.EncodeToString(hasher.Sum(nil))
}

///////////////////////////////////////////////////
func encrypt(plaintext []byte, key []byte) (string, error) {
	c, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(c)
	if err != nil {
		return "", err
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err = io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString([]byte(fmt.Sprintf("%s", gcm.Seal(nonce, nonce, plaintext, nil)))), nil
}

//////////////////////////////////////////////////
func decrypt(inp string, key []byte) (string, error) {
	ciphertext, _ := base64.URLEncoding.DecodeString(inp)
	c, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(c)
	if err != nil {
		return "", err
	}
	nonceSize := gcm.NonceSize()
	if len(ciphertext) < nonceSize {
		return "", errors.New("ciphertext too short")
	}
	nonce, ciphertext := ciphertext[:nonceSize], ciphertext[nonceSize:]
	s, err := gcm.Open(nil, nonce, ciphertext, nil)
	return fmt.Sprintf("%s", s), err
}

////////////////////////////////////
