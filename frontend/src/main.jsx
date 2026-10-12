import {SubmissionHistory} from "./SubmissionHistory.jsx";
import React, { useEffect, useRef, useState, useCallback } from "react";
import {MatchLoading} from './MatchLoading.jsx';
import {createPortal} from 'react-dom';
import { createRoot } from "react-dom/client";
import "./style.css";
import { Pixel } from "./Pixel";
import { Button } from "./ui";
import { Home, Match, Rankings, Submission, Tournament, Rules } from "./pages";
import { initialTheme, persistTheme } from "./theme";
function App() {
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
          {[
            ["home", "Overview"],
            ["tournament", "Tournament"],
            ["rankings", "Rankings"],
            ["match", "Replay"],
            ["submissions", "My Submission"],
            ["rules", "Rules & SDK"],
          ].map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              onClick={id === "match" ? e=>{e.preventDefault();go(id);} : undefined}
              aria-current={page === id ? "page" : undefined}
            >
              {label}
            </a>
          ))}
        </nav>
        <button
          className="theme-toggle"
          type="button"
          aria-label={
            theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
          }
          aria-pressed={theme === "dark"}
          title={
            theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
          }
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Pixel kind={theme === "dark" ? "sun" : "moon"} />
          <span>{theme === "dark" ? "Light" : "Dark"}</span>
        </button>
        <Button onClick={() => go("submit")}>
          Submit bot <span>↗</span>
        </Button>
      </header>
      <div className="demo-banner">
        <span className="status-dot" />
        BOT MATCH PLATFORM{" "}
        <span>
          {page === "match" && new URLSearchParams(window.location.search).has("match") ? "Java / C++ / Python submissions · server grader · live replay log" : "Java / C++ / Python bot submissions · recorded demo replay"}
        </span>
      </div>
      <main className="page" key={page}>
        {page === "home" ? (
          <Home go={go} bot={bot} />
        ) : page === "match" ? (
          <Match notify={setToast} prepare={prepare} preparing={Boolean(preparation)}/>
        ) : page === "rankings" ? (
          <Rankings />
        ) : page === "submissions" ? (
          <SubmissionHistory go={go} />
        ) : page === "submit" ? (
          <Submission bot={bot} save={saveBot} prepare={prepare}/>
        ) : page === "tournament" ? (
          <Tournament go={go} />
        ) : page === "rules" ? (
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
        <span>CODE. COMPETE. REPEAT.</span>
        <a href="#rules">Rules & SDK ↗</a>
      </footer>
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </>
  );
}
createRoot(document.getElementById("root")).render(<App />);
