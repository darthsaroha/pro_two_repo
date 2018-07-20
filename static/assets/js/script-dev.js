"use-strict";

(function(window) {

    function LocalData() {
        // variables and constants
        this.Pages = [{ url: "", temp: "home", init: InitHomePage },
            { url: "event", temp: "event", init: InitEventPage }
        ];
        this.AvailTeams = [{ name: "Arsenal FC" }, { name: "Chelsea" }, { name: "Manchester City" }, { name: "Manchester United" }];
        this.AvailEvents = [{ name: "Champions League", icon: "fas fa-trophy", view: "ChampionsLeague", matches: [0, 1, 3, 4, 5] }, { name: "League", icon: "fas fa-shield-alt", view: "League", matches: [2] }, { name: "Tournament", icon: "fas fa-medal", view: "Tournament", matches: [0, 1, 3, 4, 5] }, { name: "Challenge Series", icon: "fas fa-ribbon", view: "ChallengeSeries", matches: [6] }];
        this.EventStatus = ["fas fa-dot-circle text-primary", "fas fa-check-circle text-success", "fas fa-times-circle text-danger"];
        this.CurrentPage = 0;
        this.MatchTypes = [{ n: "Group A", p: 3 }, { n: "Group B", p: 3 }, { n: "League", p: 3 }, { n: "Semi-Final", p: 18 }, { n: "Quarter-Final", p: 9 }, { n: "Final", p: 30 }, { n: "Challenge", p: 3 }];
        this.SelectedEvent = -1;
        this.Dark = {bg: "#212329",col: "#eff3ff",cbg: "#25272d",csd: "none",pbg: "#32343c"};
        this.Params = "";
        this.EventManagers = [];
        this.User = {};
        this.All = { users: [], events: [] };
    }

    // local data
    let ld = new LocalData();

    // show modal
    function ShowModal(modal) {
        if (typeof modal === "string") { modal = document.getElementById(modal); }
        [modal.style, modal.className] = ["display: block;", "modal show"];
    }

    //close modal
    function CloseModal(modal) {
        if (typeof modal === "string") { modal = document.getElementById(modal); }
        modal.removeAttribute("style");
        modal.className = "modal";
    }

    // update view 
    function UpdateView(e) {
        e.preventDefault();
        ld.Params = window.location.hash.split("/");
        if (ld.Params[0] === "") { ld.Params.push(""); }
        let i = FindPageInd(ld.Params[1]);
        ld.Pages[i].init();
    }

    //find page
    function FindPageInd(param) {
        for (let i = 0; i < 4; i++) {
            if (ld.Pages[i].url === param) {
                return i;
            }
        }
    }

    //loader
    function Loading(start) {
        if (start) {
            document.getElementById('futbolID').innerHTML = `<span style="margin-top: -20px;" class="loaderln"></span>`;
            return;
        }
        document.getElementById('futbolID').innerHTML = `<i class="fas fa-futbol"></i> Football Manager`;
    }

    //init home page
    function InitHomePage() {
        let FetchAllDataPromise = new Promise(function(resolve, reject) {
            if (localStorage.getItem("prTwoAllData") != null) {
                resolve(true);
            } else {
                reject(false);
            }
        });
        FetchAllDataPromise.catch(function(err) {
            return GetAll();
        }).then(function(res) {
            data = JSON.parse(localStorage.getItem("prTwoAllData"));
            ld.All = data;
            RenderUsers();
            RenderEvents();
        });
    }

    // init event page 
    function InitEventPage() {
        let FetchAllDataPromise = new Promise(function(resolve, reject) {
            if (localStorage.getItem("prTwoAllData") != null) {
                resolve(true);
            } else {
                reject(false);
            }
        });
        FetchAllDataPromise.catch(function(err) {
            return GetAll();
        }).then(function(res) {
            data = JSON.parse(localStorage.getItem("prTwoAllData"));
            ld.All = data;
            ld.SelectedEvent = FindEventById(ld.Params[2]);
            RenderUsers();
            RenderEvent();
        });
    }

    // is logged
    function IsLogged() {
        if (localStorage.getItem("prTwoUserData") != null && ld.User.email == undefined) {
            ld.User = JSON.parse(localStorage.getItem("prTwoUserData"));
            document.cookie = `Auth0=${ld.User.auth[0]}`;
            document.cookie = `Auth1=${ld.User.auth[1]}`;
            document.cookie = `Auth2=${ld.User.auth[2]}`;
            RenderUsers();
            document.documentElement.style.setProperty('--control', 'inline-block');
            // document.documentElement.style.setProperty('--background', ld.Dark.bg);
            // document.documentElement.style.setProperty('--fontcolor', ld.Dark.col);
            // document.documentElement.style.setProperty('--cardbg', ld.Dark.cbg);
            // document.documentElement.style.setProperty('--cardshd', ld.Dark.csd);
            // document.documentElement.style.setProperty('--progbg', ld.Dark.pbg);
            return;
        }
    }

    IsLogged();

    // user login
    function UserLogin(e) {
        e.preventDefault();
        Loading(true);
        fetch("/auth/user", { method: 'post', headers: { "Content-type": "application/x-www-form-urlencoded; charset=UTF-8" }, body: `{ "email" : "${e.target.email.value}", "digest" : "${e.target.digest.value}"}` }).then(data => data.json())
            .then(data => {
                localStorage.setItem("prTwoUserData", JSON.stringify(data));
                IsLogged();
                CloseModal('loginJoinModalID');
                GetAll().then(function(res) {
                    data = JSON.parse(localStorage.getItem("prTwoAllData"));
                    ld.All = data;
                    if (ld.Params[1] == "") { RenderEvents(); }
                });
            })
            .catch(function(error) {})
            .then(function(res) { Loading(false); });
    }

    //user join 
    function UserJoin(e) {
        e.preventDefault();
        Loading(true);
        fetch("/join/user", { method: 'post', headers: { "Content-type": "application/x-www-form-urlencoded; charset=UTF-8" }, body: `{ "email" : "${e.target.email.value}","name": "${e.target.name.value}" ,"digest" : "${e.target.digest.value}"}` }).then(data => data.json())
            .then(data => {
                localStorage.setItem("prTwoUserData", JSON.stringify(data));
                IsLogged();
                CloseModal('loginJoinModalID');
                GetAll().then(function(res) {
                    data = JSON.parse(localStorage.getItem("prTwoAllData"));
                    ld.All = data;
                    if (ld.Params[1] == "") { RenderEvents(); }
                });
            })
            .catch(function(error) {})
            .then(function(res) { Loading(false); });
    }

    // get users
    function GetUsers() {
        Loading(true);
        return fetch("/fetch/users", { method: 'get', headers: { "Content-type": "application/x-www-form-urlencoded; charset=UTF-8" } }).then(data => data.json())
            .then(data => {
                ld.All.users = data;
                ld.PreventState.usersApi = true;
            })
            .catch(function(error) {})
            .then(function(res) { Loading(false); });
    }

    //get all
    function GetAll() {
        Loading(true);
        return fetch("/fetch/all", { method: 'get', credentials: 'include', headers: { "Content-type": "application/x-www-form-urlencoded; charset=UTF-8" } }).then(data => data.json())
            .then(data => {
                localStorage.setItem("prTwoAllData", JSON.stringify(data));
                ld.All = data;
            })
            .catch(function(error) {})
            .then(function(res) { Loading(false); });
    }

    // user card
    function UserCard() {
        let user = document.createElement('div');
        user.className = 'card mb-4';
        if (ld.User.email == undefined) {
            user.innerHTML = `<div class="card-body text-center"><button class="btn btn-primary btn-block" onclick="showModal('loginJoinModalID')">Manager Login</button></div>`;
            return user;
        }
        let form = (ld.User.form / 30) * 100;
        user.innerHTML = `<div class="card-body"><div class="media"><img class="mr-3" style="border-radius: 499rem;" width="50" src="https://www.gravatar.com/avatar/${md5(ld.User.email)}?s=80" onerror="this.onerror = null; this.src = '/assets/images/usericon.png';"><div class="media-body">${ld.User.name}<br>
                   <font class="text-muted">${ld.User.email}</font><div class="progress"><div class="progress-bar" role="progressbar" style="width: ${form}%" aria-valuenow="${form}" aria-valuemin="0" aria-valuemax="100"></div>
                    </div></div></div></div>`;
        return user;
    }

    // managers card
    function ManagersCard() {
        let managers = document.createElement('div');
        managers.className = 'card mb-4';
        let html = `<div class="card-body" id="allUsersID"><h4 class="card-title"><i class="far fa-user text-primary"></i> Managers</h4><h6 class="card-subtitle mb-2 text-muted">Current Form</h6><br>`;
        for (let i = 0; i < ld.All.users.length; i++) {
            if (ld.User.email != undefined && ld.User.email == ld.All.users[i].email) {
                continue;
            }
            let form = (ld.All.users[i].form / 30) * 100;
            html = html + `<div class="media"><img class="mr-3" style="border-radius: 499rem;" width="50" src="https://www.gravatar.com/avatar/${md5(ld.All.users[i].email)}?s=80" onerror="this.onerror = null; this.src = '/assets/images/usericon.png';"><div class="media-body">${ld.All.users[i].name}<br>
                   <font class="text-muted">${ld.All.users[i].email}</font><div class="progress"><div class="progress-bar" role="progressbar" style="width: ${form}%" aria-valuenow="${form}" aria-valuemin="0" aria-valuemax="100"></div>
                    </div></div></div><br>`;
        }
        managers.innerHTML = html;
        return managers;
    }

    // render users
    function RenderUsers() {
        let page = document.getElementById('pageViewID');
        let cont = document.createElement('div');
        cont.className = 'col-xs-12 col-md-4 col-lg-4';
        cont.appendChild(UserCard());
        cont.appendChild(ManagersCard());
        page.replaceChild(cont, page.children[0]);
    }

    // add event
    function AddEvent(e) {
        e.preventDefault();
        if (ld.EventManagers.length < 2) { return; }
        let managers = '';
        for (let i = 0; i < ld.EventManagers.length; i++) {
            if (i != 0) {
                managers = managers + ',';
            }
            managers = managers + `{\\"m\\":\\"${ld.EventManagers[i].m}\\",\\"t\\":${ld.EventManagers[i].t}}`;
        }
        let p = 1;
        if (e.target.public.checked == false) { p = 0; }
        Loading(true);
        fetch("/create/event", { method: 'post', credentials: 'include', headers: { "Content-type": "application/x-www-form-urlencoded; charset=UTF-8" }, body: `{ "type" : "${e.target.etype.value}","result" : "No Fixture Played In This ${ld.AvailEvents[e.target.etype.value].name}","public" : "${p}", "managers": "[${managers}]"}` }).then(data => data.json())
            .then(data => {
                e.target.reset();
                CloseModal('addEventModalID');
                ld.All.events.push(data);
                localStorage.setItem("prTwoAllData", JSON.stringify(ld.All));
                document.getElementById('eventCardsID').appendChild(EventCard(data));
            })
            .catch(function(error) {})
            .then(function(res) { Loading(false); });
        ld.EventManagers = [];
    }

    // get events// variables and constants
    function GetEvents() {
        Loading(true);
        return fetch("/fetch/events", { method: 'get', credentials: 'include', headers: { "Content-type": "application/x-www-form-urlencoded; charset=UTF-8" } }).then(data => data.json())
            .then(data => {
                ld.All.events = data;
                localStorage.setItem("prTwoAllData", JSON.stringify(ld.All));
            })
            .catch(function(error) {})
            .then(function(res) { Loading(false); });
    }

    // event index by id
    function FindEventById(id) {
        for (let i = 0; i < ld.All.events.length; i++) {
            if (ld.All.events[i].id == id) {
                return i;
            }
        }
        return -1;
    }


    // event card
    function EventCard(event) {
        let date = new Date(event.created_at);
        let card = document.createElement('div');
        card.className = 'col-md-6 col-xs-12 p-3';
        card.style = 'cursor: pointer';
        card.onclick = function(e) {
            e.preventDefault();
            window.location.hash = `/event/${event.id}`;
        }
        card.innerHTML = `<div class="card"><div class="card-body"><center><i class="${ld.AvailEvents[event.type].icon} fa-3x text-primary"></i><h4 class="mt-3">${ld.AvailEvents[event.type].name}</h4>
            <i class="far fa-calendar-alt text-primary"></i> ${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}<br>
            <i class="fas fa-angle-down fa-2x mt-2" style="cursor: pointer; color: #888;" onclick="javascript: event.stopPropagation(); this.nextElementSibling.classList.toggle('d-none'); if(this.classList.contains('fa-angle-down')) {this.className='fas fa-angle-up fa-2x mt-2';}else {this.className='fas fa-angle-down fa-2x mt-2';}"></i>
            <div class="d-none row"><div class="col-6"><h2 class="text-primary">${event.managers.length}</h2><font class="text-muted">Teams</font></div><div class="col-6"><h2 class="text-primary">${event.fixtures.length}</h2><font class="text-muted">Fixtures</font></div><div class="col-12 mt-2 text-primary">${event.result}</div></div></center></div></div>`;
        return card;
    }

    //reload events
    function ReloadEvents() {
        GetEvents().then(function() {
            RenderEvents();
        });
    }

    //get single event
    function GetEvent() {
        Loading(true);
        return fetch("/event?eid=" + ld.Params[2], { method: 'get', credentials: 'include', headers: { "Content-type": "application/x-www-form-urlencoded; charset=UTF-8" } }).then(data => data.json())
            .then(data => {
                ld.All.events.push(data);
                ld.SelectedEvent = 0;
            })
            .catch(function(error) {})
            .then(function(res) { Loading(false); });
    }

    //render events
    function RenderEvents() {
        let page = document.getElementById('pageViewID');
        let cont = document.createElement('div');
        cont.className = 'col-xs-12 col-md-8 col-lg-8';
        cont.innerHTML = `<h2><i class="far fa-calendar text-primary"></i> <font class="text-primary">Your</font> Events </h2>
                    <font class="text-muted">Showing Football Events </font>
                    <br>
                    <br>
                    <a class="card-link admin-control" onclick="javascript: prepAddEventForm();"><i class="fas fa-plus-circle  text-primary"></i> Add New</a>
                    <a class="card-link" onclick="reloadEvents()"><i class="fas fa-sync-alt text-primary"></i> Refresh</a>
                    <hr>`;
        cont.appendChild(EventCards());
        page.replaceChild(cont, page.children[1]);
    }

    // render event cards
    function EventCards() {
        let cont = document.createElement('div');
        cont.id = 'eventCardsID';
        cont.className = 'row';
        for (let i = 0; i < ld.All.events.length; i++) {
            cont.appendChild(EventCard(ld.All.events[i]));
        }
        return cont;
    }

    // find user by email
    function FindUserByEmail(email) {
        for (let i = 0; i < ld.All.users.length; i++) {
            if (ld.All.users[i].email == email) {
                return [ld.All.users[i], i];
            }
        }
        return [{}, -1];
    }

    // prepare add event form
    function PrepAddEventForm() {
        let form = document.querySelector(`form[name="addEventForm"]`);
        ld.EventManagers = [];
        if (form.emanager.children.length == 0 || form.eteam.children.length == 0) {
            let teams = '';
            let managers = '';
            for (let i = 0; i < ld.All.users.length; i++) {
                managers = managers + `<option value="${ld.All.users[i].email}">${ld.All.users[i].name}</option>`;
            }
            for (let i = 0; i < ld.AvailTeams.length; i++) {
                teams = teams + `<option value="${i}">${ld.AvailTeams[i].name}</option>`;
            }
            form.emanager.innerHTML = managers;
            form.eteam.innerHTML = teams;
        }
        form.children[1].children[0].children[0].innerHTML = '';
        ShowModal('addEventModalID');
    }

    // add manager team
    function AddManagerTeam() {
        let form = document.querySelector(`form[name="addEventForm"]`);
        for (let i = 0; i < ld.EventManagers.length; i++) {
            if (ld.EventManagers[i].t == form.eteam.value) { return; }
        }
        ld.EventManagers.push({ m: form.emanager.value, t: form.eteam.value });
        let team = document.createElement('div');
        team.innerHTML = `<p id="${form.emanager.value}${form.eteam.value}">${ld.AvailTeams[form.eteam.value].name}<br><small class="text-muted">${form.emanager.value}</small><br><a onclick="javascript: removeManagerTeam(this);">Remove</a></p>`;
        form.children[1].children[0].children[0].prepend(team);
    }

    // remove manager team
    function RemoveManagerTeam(el) {
        for (let i = 0; i < ld.EventManagers.length; i++) {
            if ((ld.EventManagers[i].m + ld.EventManagers[i].t) == el.parentNode.id) {
                ld.EventManagers.splice(i, 1);
                el.parentNode.remove();
                return;
            }
        }
    }

    // verify event access
    function VerifyEventAccess(event) {
        for (let i = 0; i < event.managers.length; i++) {
            if (event.managers[i].m == ld.User.email) {
                return true;
            }
        }
        return false;
    }

    // event header
    function EventHeader(event) {
        let header = document.createElement('div');
        let date = new Date(event.created_at);
        if (VerifyEventAccess(event) == false) {}
        header.innerHTML = `<center><i class="${ld.AvailEvents[event.type].icon} fa-3x text-primary"></i><h2>${ld.AvailEvents[event.type].name}</h2>
        <i class="far fa-calendar-alt text-primary"></i> ${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}</center>
        <div class="mt-3 mb-4 card"><div class="card-body"><h5>Status</h5><font class="text-primary">${event.result}</font></div></div>
        <a class="card-link" href="/#/"><i class="fas fa-bars  text-primary"></i> View All</a>
        <a class="card-link admin-control" onclick="prepAddFixtureForm()"><i class="fas fa-plus-circle  text-primary"></i> Add Fixture</a><hr>`;
        return header;
    }

    //event fixture card
    function FixtureCard(fixture) {
        let cont = document.createElement('div');
        cont.innerHTML = `<div class="card mb-2"><div class="card-body text-center"><font class="text-muted">${ld.MatchTypes[fixture.ft].n}</font><br><div class="row"><div class="col-xs-12 col-md-4 col-lg-4">${ld.AvailTeams[fixture.ht].name}</div><div class="col-xs-12 col-md-4 col-lg-4"> <font class="text-primary ml-2 mr-2">${fixture.hg} <font class="text-muted">vs</font> ${fixture.ag}</font></div><div class="col-xs-12 col-md-4 col-lg-4">  ${ld.AvailTeams[fixture.at].name}</div></div></div></div>`;
        return cont;
    }

    // event fixture
    function EventFixtures(event) {
        let cont = document.createElement('div');
        cont.className = 'col-xs-12 col-md-7 col-lg-7';
        cont.id = 'eventFixturesID';
        for (let i = 0; i < event.fixtures.length; i++) {
            cont.appendChild(FixtureCard(event.fixtures[i]));
        }
        return cont;
    }

    // event info
    function EventInfo(event) {
        let cont = document.createElement('div');
        let teams = '';
        for (let i = 0; i < event.managers.length; i++) {
            let user = FindUserByEmail(event.managers[i].m)[0];
            teams = teams + `<p>${ld.AvailTeams[event.managers[i].t].name}<br><font class="text-muted">${user.name}</font></p>`;
        }
        cont.className = 'col-xs-12 col-md-5 col-lg-5';
        cont.id = "eventInfoID";
        cont.innerHTML = `<div class="card"><div class="card-body"><h5>Teams</h5>${teams}</div></div>`;
        return cont;
    }

    //render event
    function RenderEvent() {
        let page = document.getElementById('pageViewID');
        let cont = document.createElement('div');
        cont.className = 'col-xs-12 col-md-8 col-lg-8';
        cont.appendChild(EventHeader(ld.All.events[ld.SelectedEvent]));
        let section = document.createElement('div');
        section.className = 'row';
        section.id = "eventDetailsID";
        section.appendChild(EventInfo(ld.All.events[ld.SelectedEvent]));
        section.appendChild(EventFixtures(ld.All.events[ld.SelectedEvent]));
        cont.appendChild(section);
        page.replaceChild(cont, page.children[1]);
    }

    //prepare add fixture form
    function PrepAddFixtureForm() {
        let form = document.querySelector(`form[name="addFixtureForm"]`);
        let teams = '';
        for (let i = 0; i < ld.All.events[ld.SelectedEvent].managers.length; i++) {
            teams = teams + `<option value="${ld.All.events[ld.SelectedEvent].managers[i].t}">${ld.AvailTeams[ld.All.events[ld.SelectedEvent].managers[i].t].name}</option>`;
        }
        let fixtures = '';
        for (let i = 0; i < ld.AvailEvents[ld.All.events[ld.SelectedEvent].type].matches.length; i++) {
            fixtures = fixtures + `<option value="${ld.AvailEvents[ld.All.events[ld.SelectedEvent].type].matches[i]}">${ld.MatchTypes[ld.AvailEvents[ld.All.events[ld.SelectedEvent].type].matches[i]].n}</option>`;
        }
        form.hometeam.innerHTML = teams;
        form.awayteam.innerHTML = teams;
        form.fixturetype.innerHTML = fixtures;
        showModal('addFixtureModalID');
    }

    // calculate result
    function CalculateResult(fixture) {
        if (typeof fixture.hg == "string") {
            fixture.hg = parseInt(fixture.hg);
            fixture.ag = parseInt(fixture.ag);
        }
        let diff = fixture.hg - fixture.ag;
        let pl = 's';
        if (diff == 1 || diff == -1) {
            pl = '';
        }
        let winner = -1;
        let looser = -1;
        let status = `There Was A Draw Between ${ld.AvailTeams[fixture.ht].name} And ${ld.AvailTeams[fixture.at].name}`;
        if (fixture.hg > fixture.ag) {
            winner = fixture.ht;
            looser = fixture.at;
            status = `${ld.AvailTeams[fixture.ht].name} Defeated ${ld.AvailTeams[fixture.at].name} By ${diff} Goal${pl}`;
        }
        if (fixture.hg < fixture.ag) {
            winner = fixture.at;
            looser = fixture.ht;
            status = `${ld.AvailTeams[fixture.ht].name} Lost To ${ld.AvailTeams[fixture.at].name} By ${fixture.ag - fixture.hg} Goal${pl}`;
        }
        return [winner, status, looser];
    }

    //add fixture
    function AddFixture(e) {
        e.preventDefault();
        if (e.target.hometeam.value == e.target.awayteam.value) { return; }
        let date = new Date();
        let fixture = { ht: e.target.hometeam.value, hg: e.target.hometeamgs.value, at: e.target.awayteam.value, ag: e.target.awayteamgs.value, ft: e.target.fixturetype.value, dt: `${date.getDate()}/${date.getMonth()}/${date.getFullYear()}` };
        ld.All.events[ld.SelectedEvent].fixtures.push(fixture);
        let result = CalculateResult(fixture);
        ld.All.events[ld.SelectedEvent].result = result[1];
        Loading(true);
        fetch("/add/fixture?eid=" + ld.All.events[ld.SelectedEvent].id + "&result=" + ld.All.events[ld.SelectedEvent].result, { method: 'post', credentials: 'include', headers: { "Content-type": "application/x-www-form-urlencoded; charset=UTF-8" }, body: `{ "ht": ${e.target.hometeam.value}, "hg": ${e.target.hometeamgs.value}, "at": ${e.target.awayteam.value}, "ag": ${e.target.awayteamgs.value}, "ft": ${e.target.fixturetype.value}, "dt": "${date.getDate()}/${date.getMonth()}/${date.getFullYear()}"  }`, }).then(data => data.json())
            .then(data => {
                e.target.reset();
                RenderEvent();
                UpdateUserForm(result, ld.All.events[ld.SelectedEvent]);
                localStorage.setItem("prTwoAllData", JSON.stringify(ld.All));
                RenderUsers();
                CloseModal('addFixtureModalID');
            })
            .catch(function(error) {})
            .then(function(res) { Loading(false); });
    }

    //update user form
    function UpdateUserForm(result, event) {
        for (let i = 0; i < event.managers.length; i++) {
            if (event.managers[i].t == result[0]) {
                if (ld.All.users[FindUserByEmail(event.managers[i].m)[1]].form != 30) {
                    ld.All.users[FindUserByEmail(event.managers[i].m)[1]].form += 3;
                }
                if (ld.User.email == event.managers[i].m) {
                    if (ld.User.form != 30) {
                        ld.User.form += 3;
                    }
                }
            }
            if (event.managers[i].t == result[2]) {
                if (ld.All.users[FindUserByEmail(event.managers[i].m)[1]].form != 0) {
                    ld.All.users[FindUserByEmail(event.managers[i].m)[1]].form -= 3;
                }
                if (ld.User.email == event.managers[i].m) {
                    if (ld.User.form != 0) {
                        ld.User.form -= 3;
                    }
                }
            }
        }
    }


    // hash change event
    window.addEventListener("load", UpdateView, false);
    window.addEventListener("popstate", UpdateView, false);

    // form events
    document.querySelector(`form[name="loginForm"]`).addEventListener('submit', UserLogin, false);
    document.querySelector(`form[name="joinForm"]`).addEventListener('submit', UserJoin, false);
    document.querySelector(`form[name="addEventForm"]`).addEventListener('submit', AddEvent, false);
    document.querySelector(`form[name="addFixtureForm"]`).addEventListener('submit', AddFixture, false);

    // function exposed to window
    window.showModal = ShowModal;
    window.prepAddEventForm = PrepAddEventForm;
    window.closeModal = CloseModal;
    window.reloadEvents = ReloadEvents;
    window.addManagerTeam = AddManagerTeam;
    window.removeManagerTeam = RemoveManagerTeam;
    window.prepAddFixtureForm = PrepAddFixtureForm;

}(window));