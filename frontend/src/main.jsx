import {ThemeSwitch} from './ThemeSwitch.jsx';
import {CharacterStudio} from './CharacterStudio.jsx';
import {StudioTournaments} from './StudioTournaments.jsx';
import {MotionEnvironment,useDecorativeVisibility} from './MotionPreferences.jsx';
import {MyBot} from './BotSubmission.jsx';
import {WatchLive} from './WatchLive.jsx';
import './tournamentExtensions.css';
import {PreviewAccounts,useAccounts} from './PreviewAccounts.jsx';
import {LoginPage,LoginGate,AccountControl,TournamentAccountPage,AccountRankings} from './AccountPages.jsx';
import {AccountSettings} from './AccountSettings.jsx';
import {JudgeAccounts,RegisterPage} from './JudgeAccounts.jsx';
import {SubmissionHistory} from "./SubmissionHistory.jsx";
import React, { useEffect, useRef, useState, useCallback } from "react";
import {MatchLoading} from './MatchLoading.jsx';
import {createPortal} from 'react-dom';
import { createRoot } from "react-dom/client";
import "./style.css";
import "./refinements.css";
import "./approvedDesign.css";
import "./studio.css";
import "./accountFeatures.css";
import "./homeInteractions.css";
import { Pixel } from "./Pixel";
import { Button } from "./ui";
import { Home, Match, Rankings, Submission, Tournament, Rules } from "./pages";
import { initialTheme, persistTheme } from "./theme";

function App() {
  const {user,authChecking,loading}=useAccounts();
  const [preparation,setPreparation]=useState(null);
  const prepare=useCallback((stage,matchId)=>setPreparation(current=>stage?{stage,matchId:matchId||current?.matchId}:null),[]);
  const [theme, setTheme] = useState(() => {
    let storage;
    try {
      storage = window.localStorage;
    } catch {}
    return initialTheme(
      storage,
      window.matchMedia("(prefers-color-scheme: dark)").matches,
    );
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    let storage;
    try {
      storage = window.localStorage;
    } catch {}
    persistTheme(storage, theme);
  }, [theme]);
  const [page, setPage] = useState(location.hash.slice(1) || "home"),
    [menu, setMenu] = useState(false),
    [toast, setToast] = useState(""),
    [bot, setBot] = useState(() => {
      try {
        return (
          JSON.parse(localStorage.getItem("ott-bot")) || {
            name: "Atlas",
            version: 12,
            language: "Python",
            file: "atlas_v12.py",
          }
        );
      } catch {
        return {
          name: "Atlas",
          version: 12,
          language: "Python",
          file: "atlas_v12.py",
        };
      }
    });
  useDecorativeVisibility(page);
  const go = (p) => {
    if (p === 'match') {
      const url = new URL(location.href); url.searchParams.delete('match');url.searchParams.delete('room');url.hash='match';
      location.href=url.href;setMenu(false);return;
    }
    location.hash = p;
    setMenu(false);
  };
  useEffect(() => {
    const fn = () => {
      setPage(location.hash.slice(1) || "home");
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    window.addEventListener("hashchange", fn);
    return () => window.removeEventListener("hashchange", fn);
  }, []);
  useEffect(()=>{if(!['practice','match'].includes(page))setPreparation(null);},[page]);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(""), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  const saveBot = (b) => {
    setBot(b);
    try {localStorage.setItem("ott-bot", JSON.stringify(b));setToast("Submission saved in this browser.");}
    catch {setToast("Submission created; local saving is unavailable.");}
  };
  return (
    <>
      <MotionEnvironment/>
      {preparation&&createPortal(<div className="submission-loading-overlay"><MatchLoading stage={preparation.stage} matchId={preparation.matchId} preview={Boolean(window.__OFFLINE_PREVIEW__)}/></div>,document.body)}
      <header className="header">
        <a className="brand" href="#home">
          <Pixel />
          OTTv2<span className="brand-note">BOT ARENA</span>
        </a>
        <button
          className="menu-button"
          aria-expanded={menu}
          aria-label="Toggle navigation"
          onClick={() => setMenu(!menu)}
        >
          ☰
        </button>
        <nav className={menu ? "open" : ""}>
          {(user?.role==='judge'?[
            ['home','Overview'],['tournaments','Manage Tournaments'],['watch','Matches'],['api','API']
          ]:user?[
            ['home','Overview'],['tournaments','Tournaments'],['mybot','My Bot'],['watch','Matches'],['api','API']
          ]:[
            ['home','Overview'],['tournaments','Tournaments'],['watch','Matches'],['api','API']
          ]).map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              onClick={id === "match" ? e=>{e.preventDefault();go(id);} : undefined}
              aria-current={(page === id || (id === "watch" && (page.startsWith("watch") || page==='match'&&new URLSearchParams(location.search).has('match'))) || (id === "tournaments" && ["tournament","rankings"].includes(page)) || (id === "api" && page === "rules") || (id === "mybot" && ["practice","submit","submissions"].includes(page))) ? "page" : undefined}
            >
              {label}
            </a>
          ))}
        </nav>
        <ThemeSwitch theme={theme} onChange={setTheme}/>
        <AccountControl go={go}/>
      </header>
      <div className="demo-banner">
        <span className="status-dot" />
        OTT ARENA{" "}<span>{authChecking?'Checking session':user?.role==='judge'?'Judge workspace':user?'Player workspace':'Spectator access'} · tournament bots and live matches</span>
      </div>
      <main className="page" key={page}>
        {authChecking ? (
          <section className="card account-gate" role="status" aria-live="polite" aria-busy="true"><h1>CHECKING SESSION</h1><p>Verifying your saved login…</p></section>
        ) : loading&&['tournament','tournaments','mybot','rankings','submissions'].includes(page) ? (
          <section className="card account-gate" role="status" aria-live="polite" aria-busy="true"><h1>LOADING TOURNAMENTS</h1><p>{user?'You are logged in. Fetching your tournament workspace…':'Fetching tournament data…'}</p></section>
        ) : page === "settings" ? (user ? <AccountSettings key={user.id}/> : <LoginGate go={go}/>) : page === "accounts" ? (user?.role==='judge' ? <JudgeAccounts key={user.id} go={go}/> : user ? <section className="card"><h1>JUDGE ACCESS REQUIRED</h1><p>Your account cannot manage player accounts.</p></section> : <LoginGate go={go}/>) : page === "register" ? <RegisterPage go={go}/> : page === "customize" ? (user ? <CharacterStudio key={user.id} notify={setToast}/> : <LoginGate go={go}/>) : page === "home" ? (
          <Home go={go} bot={bot} />
        ) : page === "match" ? (
          <Match notify={setToast} prepare={prepare} preparing={Boolean(preparation)}/>
        ) : page === "tournaments" ? (
          <StudioTournaments go={go}/>
        ) : page.startsWith("watch") ? (
          <WatchLive go={go} route={page}/>
        ) : page === "rankings" ? (
          <AccountRankings />
         ) : ["mybot","submit"].includes(page) ? (
          <MyBot go={go}/>
        ) : page === "submissions" ? (
          user?.role==='player'||(user&&user.role!=='judge') ? <SubmissionHistory go={go}/> : <LoginGate go={go}/>
        ) : page === "practice" ? (
          user&&user.role!=='judge' ? <Submission bot={bot} save={saveBot} prepare={prepare}/> : <StudioTournaments go={go}/>
        ) : page === "tournament" ? (
          <TournamentAccountPage go={go} />
        ) : page === "login" ? (
          <LoginPage go={go}/>
        ) : page === "api" || page === "rules" ? (
          <Rules />
        ) : (
          <Home go={go} bot={bot} />
        )}
      </main>
      <footer>
        <a className="brand" href="#home">
          <Pixel />
          OTTv2
        </a>
        <span>CODE COMPETE REPEAT</span>
        <a href="#api">API ↗</a>
      </footer>
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </>
  );
}
createRoot(document.getElementById("root")).render(<PreviewAccounts><App /></PreviewAccounts>);
