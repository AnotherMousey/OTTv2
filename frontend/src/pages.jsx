import {MatchLoading} from './MatchLoading.jsx';
import {motionTiming} from "./motion.js";
import {getPreviewRecord,previewReplay,savePreviewSubmission} from "./SubmissionHistory.jsx";
import {historyStorage,readHistory,writeHistory,updateHistoryMatch,matchFailure} from "./submissionHistory.js";
import {examples as botExamples} from "./games/ottv2/botExamples.js";
import samples from "./games/samples.json" with {type:"json"};
import bundledMaps from "./games/maps.json" with {type:"json"};
import { pythonExample } from "./games/ottv2/botExample.js";
import { resolveGame } from "./games/registry.js";
import React, { useEffect, useRef, useState } from "react";
import { demoReplay, parseReplay, TYPES } from "./replay";
import { Pixel } from "./Pixel";
import { Board } from "./Board";
import { useRoomReplay } from "./hooks/useRoomReplay.js";
import { useBotMatch } from "./hooks/useBotMatch.js";
import { createBotMatch, submitBot, getGameSpecification, waitForBackend } from "./api/matchApi.js";
import { Button, Landscape, ranks } from "./ui";
export function Home({ go, bot }) {
  return (
    <>
      <section className="hero">
        <div className="hero-art">
          <Landscape className="tall">
            <div className="big-sprite">
              <Pixel kind="hammer" />
            </div>
            <div className="art-label">
              ONE BOARD.
              <br />
              ENDLESS STRATEGIES.
            </div>
            <div className="art-piece p1">
              <Pixel kind="paper" side="black" />
            </div>
            <div className="art-piece p2">
              <Pixel kind="scissors" />
            </div>
          </Landscape>
        </div>
        <div className="hero-content">
          <div className="art-row">
            <Landscape>
              <Pixel className="art-icon" />
            </Landscape>
            <Landscape className="gold">
              <Pixel kind="trophy" className="art-icon" />
            </Landscape>
            <div className="mini-board">
              <Board frame={demoReplay.frames[0]} compact />
            </div>
          </div>
          <div className="eyebrow">UNIVERSITY BOT PROGRAMMING TOURNAMENT</div>
          <h1>
            BUILD A BOT.
            <br />
            MAKE YOUR MOVE.
          </h1>
          <p className="hero-copy">
            Your code. Your strategy. Your climb to the top.
            <br />
            Write a bot and let it do the battling.
          </p>
          <div className="chips">
            <span>JAVA</span>
            <span>PYTHON</span>
            <span>C++</span>
          </div>
          <div className="hero-actions">
            <Button onClick={() => go("submit")}>Submit your bot ↗</Button>
            <Button secondary onClick={() => go("rules")}>
              Explore the rules
            </Button>
          </div>
        </div>
      </section>
      <section className="season-strip">
        <b>
          <Pixel kind="flag" />
          SEASON 2026
        </b>
        <span>Weekly submission · 21:00</span>
      </section>
      <div className="section-heading">
        <h2>YOUR COMPETITION</h2>
        <span>A little code. A lot of possibility.</span>
      </div>
      <section className="dashboard-grid">
        <article className="card">
          <div className="card-title">
            <h3>MY BOT</h3>
            <span>01</span>
          </div>
          <div className="bot-summary">
            <Pixel />
            <div>
              <h3>
                {bot.name} v{bot.version}
              </h3>
              <p>{bot.language}</p>
              <span className="status">
                <i />
                Saved locally
              </span>
            </div>
          </div>
          <div className="card-bottom">
            <small>Your saved bot version</small>
            <Button onClick={() => go("submissions")}>My Submission ↗</Button>
          </div>
        </article>
        <article className="card">
          <div className="card-title">
            <h3>TOP OF THE TABLE</h3>
            <span>02</span>
          </div>
          {ranks.slice(0, 3).map(([name, elo], i) => (
            <div className="rank-row" key={name}>
              <b className="rank-number">0{i + 1}</b>
              <Pixel side={i % 2 ? "black" : "white"} />
              <span>{name}</span>
              <b>{elo}</b>
            </div>
          ))}
          <button className="text-link" onClick={() => go("rankings")}>
            View all rankings ↗
          </button>
        </article>
        <article className="card match-card">
          <div className="card-title">
            <h3>LATEST REPLAY</h3>
            <span>03</span>
          </div>
          <div className="preview-caption">
            <span>No bot matches yet.</span>
            <small>LIVE SUBMISSIONS ONLY</small>
          </div>
          <Button onClick={() => go("submit")}>Submit bots ▷</Button>
        </article>
      </section>
      <section className="how-section">
        <div>
          <span className="eyebrow">FROM SOURCE CODE TO SCOREBOARD</span>
          <h2>
            LET YOUR
            <br />
            CODE COMPETE.
          </h2>
        </div>
        {[
          ["01", "BUILD", "Use the game SDK in Java, Python or C++."],
          ["02", "SUBMIT", "Choose the bot version you want to compete with."],
          ["03", "WATCH", "Follow every move, inspect logs, learn, repeat."],
        ].map(([n, t, d]) => (
          <article key={n}>
            <span className="step-number">{n}</span>
            <h3>{t}</h3>
            <p>{d}</p>
          </article>
        ))}
      </section>
    </>
  );
}
export function Match({ notify, prepare, preparing=false }) {
  const roomId = new URLSearchParams(window.location.search).get("room");
  const botMatchId = new URLSearchParams(window.location.search).get("match");
  const previewRecord = window.__OFFLINE_PREVIEW__ ? getPreviewRecord(botMatchId) : null;
  const submissionContext = Boolean(botMatchId);
  const [remoteEnabled, setRemoteEnabled] = useState(Boolean(roomId));
  const remote = useRoomReplay(roomId, remoteEnabled);
  const [botRemoteEnabled, setBotRemoteEnabled] = useState(Boolean(botMatchId) && !window.__OFFLINE_PREVIEW__);
  const botRemote = useBotMatch(botRemoteEnabled ? botMatchId : null);
  const [previewLoading,setPreviewLoading]=useState(Boolean(previewRecord&&!previewRecord.runtimeFailure));
  const [previewStage,setPreviewStage]=useState('queued');
  useEffect(()=>{if(!previewLoading)return;const a=setTimeout(()=>setPreviewStage('running'),650),b=setTimeout(()=>setPreviewStage('replay'),1700),c=setTimeout(()=>setPreviewLoading(false),2400);return()=>{clearTimeout(a);clearTimeout(b);clearTimeout(c);};},[previewLoading]);
  const lastMatch = useRef(null);
  const emptyReplay = {
    schemaVersion: 1, gameId: "ottv2", rulesVersion: "live",
    boardSize: 9, mapName: "No replay selected", maxMoves: 1,
    firstSide: "white", teams: { white: "White", black: "Black" },
    frames: [{ pieces: [], event: "Submit two bots to create a replay.", side: "white" }],
  };
  const [replay, setReplay] = useState(() => previewRecord ? previewReplay(previewRecord) : roomId ? {
    ...demoReplay, mode: "room-recording", rulesVersion: "legacy-timed",
    mapName: `Room ${roomId}`, teams: { white: "White player", black: "Black player" }, bots: undefined,
    frames: [{ pieces: [], event: "Loading recorded room snapshots…", side: "white" }],
  } : (window.__OFFLINE_PREVIEW__ && !botMatchId ? samples[0].replay : emptyReplay)),
    [index, setIndex] = useState(0),
    [playing, setPlaying] = useState(false),
    [animateStep, setAnimateStep] = useState(true),
    [speed, setSpeed] = useState(1),
    [flipped, setFlipped] = useState(false),
    [selected, setSelected] = useState(null),
    [tab, setTab] = useState("events"),
    [error, setError] = useState("");
  const input = useRef();
  useEffect(() => {
    if (!remoteEnabled || !remote.replay) return;
    const next = remote.replay;
    setReplay(next);
    setSelected(null);
    if (lastMatch.current !== next.matchId) {
      setIndex(0);
      setPlaying(false);
      lastMatch.current = next.matchId;
    } else setIndex(i => Math.min(i, next.frames.length - 1));
  }, [remote.replay, remoteEnabled]);
  const roomRecording = replay.mode === "room-recording";
  useEffect(() => {
    if (!botRemote.replay) return;
    setReplay(botRemote.replay);
    updateHistoryMatch(botMatchId,botRemote.status || {status:"finished",result:botRemote.replay.result},historyStorage());
    setSelected(null);
    setIndex(0);
    setPlaying(false);
  }, [botRemote.replay]);
  useEffect(()=>{
    if(!preparing)return;
    if(previewRecord){prepare(previewLoading?previewStage:null,botMatchId);return;}
    if(botRemote.error||botRemote.status?.error){prepare(null);return;}
    if(botRemote.replay && replay.matchId===botMatchId){prepare(null);return;}
    if(!botRemote.status)return; // Preserve the submission stage while the first status request is pending.
    prepare(botRemote.status?.status==='finished'?'replay':botRemote.status?.status==='running'?'running':botRemote.status?.status==='queued'?'queued':'connect',botMatchId);
  },[preparing,prepare,previewRecord?.matchId,previewLoading,previewStage,botRemote.error,botRemote.status?.status,botRemote.status?.error,botRemote.replay,replay.matchId,botMatchId]);
  const failure = matchFailure(replay);
  const game = resolveGame(replay);
  const GamePiece = game.Piece;
  const boardWidth = replay.board?.width ?? replay.boardSize;
  const boardHeight = replay.board?.height ?? replay.boardSize;
  const frame = replay.frames[Math.min(index, replay.frames.length - 1)];
  const end = replay.frames.length - 1;
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(
      () =>
        setIndex((i) => {
          if (i >= end) {
            setPlaying(false);
            return i;
          }
          setAnimateStep(true);
          return i + 1;
        }),
      motionTiming(speed).intervalMs,
    );
    return () => clearInterval(t);
  }, [playing, speed, end]);
  const seek = (i) => {
    setPlaying(false);
    const next = Math.max(0, Math.min(end, i));
    setAnimateStep(Math.abs(next-index)===1);
    setIndex(next);
  };
  const download = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(replay, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = replay.roomId ? `${replay.roomId}-replay.json` : "ottv2-demo-replay.json";
    a.click();
    URL.revokeObjectURL(url);
    notify("Replay exported. You can import it again.");
  };
  const loadSample = (id) => {
    const sample=samples.find(item=>item.id===id);
    if (!sample) return;
    setRemoteEnabled(false); setBotRemoteEnabled(false);
    setReplay(parseReplay(JSON.stringify(sample.replay))); setIndex(0); setPlaying(false); setSelected(null); setError('');
    notify('Engine-verified sample loaded.');
  };
  const upload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      if (file.size > 5e6) throw Error("Replay must be under 5 MB.");
      const data = parseReplay(await file.text());
      setRemoteEnabled(false);
      setBotRemoteEnabled(false);
      setPlaying(false);
      setReplay(data);
      setIndex(0);
      setSelected(null);
      setError("");
      notify("Replay loaded.");
    } catch (err) {
      setError(err.message);
    }
    e.target.value = "";
  };
  const piece = frame.pieces.find((p) => p.id === selected);
  if(previewLoading && preparing)return null;
  if(previewLoading)return <MatchLoading stage={previewStage} preview matchId={botMatchId}/>;
  if(botRemoteEnabled && (!botRemote.replay || replay.matchId!==botMatchId)){
    const problem=botRemote.status?.error||botRemote.error;
    if(problem)return <section className="match-loading loading-failure"><span className="eyebrow">BOT MATCH / {botMatchId}</span><h1>MATCH NOT READY.</h1><p className="error" role="alert">{problem}</p><p className="muted">Check your connection and backend status.</p><Button secondary onClick={()=>window.location.reload()}>Retry connection ↗</Button></section>;
    if(preparing)return null;
    return <MatchLoading stage={botRemote.status?.status==='finished'?'replay':botRemote.status?.status==='running'?'running':botRemote.status?.status==='queued'?'queued':'connect'} matchId={botMatchId}/>;
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">{submissionContext ? "SUBMISSION MATCH / REPLAY" : roomRecording ? "RECORDED ROOM / HUMAN MATCH" : "RECORDED MATCH / ROUND OF 16"}</span>
          <h1>
            REPLAY<span className="yellow-dot">.</span>
          </h1>
        </div>
        <div className="heading-actions">
          {!submissionContext && !roomId && <select aria-label="Load finished sample match" defaultValue="" onChange={e=>{loadSample(e.target.value);e.target.value='';}}>
            <option value="">Finished sample matches…</option>
            {samples.map(sample=><option key={sample.id} value={sample.id}>{sample.title}</option>)}
          </select>}
          {!submissionContext && <Button secondary onClick={() => input.current.click()}>
            Import replay
          </Button>}
          <Button secondary onClick={download}>
            Export log ↗
          </Button>
          <input
            ref={input}
            hidden
            type="file"
            accept=".json"
            onChange={upload}
          />
        </div>
      </div>
      {(error || (remoteEnabled && remote.error) || (botRemoteEnabled && (botRemote.error || botRemote.status?.error))) && (
        <p className="error" role="alert">
          {error || remote.error || botRemote.error || botRemote.status?.error}
        </p>
      )}
      {botRemoteEnabled && botMatchId && !botRemote.replay && (
        <p className="muted">
          Bot match: {botRemote.status?.status || "connecting"}.
      The grader is running both submissions on the server.
        </p>
      )}
      {previewRecord && <p className="muted">Preview submission replay · recorded fixture; source code was not executed.</p>}
      {submissionContext && window.__OFFLINE_PREVIEW__ && !previewRecord && <p className="muted">This submitted match requires the backend. Offline preview cannot load its recording.</p>}
      {failure && <div className="runtime-notice" role="status"><strong>{failure.title}</strong><p>{failure.detail}</p><p>The recorded outcome is {replay.result?.winner || 'unknown'} by forfeit. This is separate from a win achieved through game moves.</p></div>}
      <div className="viewer">
        <aside className="team-sidebar">
          <div className="match-meta">
            <span className="eyebrow">{game.title} / RULES {replay.rulesVersion}</span>
            <h3>{replay.mapName}</h3>
            <p>{boardWidth} × {boardHeight} board · {replay.maxMoves == null ? (replay.timeLimitMs == null ? "limit metadata unavailable" : `${replay.timeLimitMs / 60000}-minute player clocks`) : `${replay.maxMoves} turn limit`}</p>
            <small>First side: {replay.firstSide} · {roomRecording ? "server room" : "judge configuration"}</small>
          </div>
          {["white", "black"].map((s, i) => (
            <section className={`team-panel ${s}`} key={s}>
              <div className="team-name">
                <Pixel side={s} />
                <div>
                  <h3>{replay.teams[s]}</h3>
                  <small>
                    {replay.bots?.[s] ? `${replay.bots[s].language} · ${replay.bots[s].version}` : roomRecording ? "Human player" : "Bot metadata unavailable"} · {s}
                  </small>
                </div>
              </div>
              <div className="piece-counts">
                {game.types.map((t) => (
                  <div key={t}>
                    <GamePiece kind={t} side={s} />
                    <strong>
                      {
                        frame.pieces.filter((p) => p.side === s && p.type === t)
                          .length
                      }
                    </strong>
                    <small>{game.label(t)}</small>
                  </div>
                ))}
              </div>
            </section>
          ))}
          <div className="inspector">
            <span className="eyebrow">PIECE INSPECTOR</span>
            {piece ? (
              <>
                <h3>{game.label(piece.type)}</h3>
                <p>
                  {piece.side} · {String.fromCharCode(97 + piece.x)}
                  {boardHeight - piece.y}
                </p>
                <small>ID: {piece.id}</small>
              </>
            ) : (
              <p>Select a piece to inspect its position.</p>
            )}
          </div>
        </aside>
        <section className="arena">
          {frame.status === 'finished' && <p className="status" role="status">{failure ? 'Match stopped' : frame.winner ? `${replay.teams[frame.winner]} wins` : 'Draw'} · {game.reasonLabel?.(frame.endReason || replay.result?.reason) || 'Match finished'}{replay.result?.remaining ? ` · ${replay.result.remaining.white}–${replay.result.remaining.black} pieces` : ''}</p>}
          <div className="arena-toolbar">
            <div>
              <span className="status-dot" />
              <b>
                {remoteEnabled && remote.loading
                  ? "LOADING ROOM"
                  : remoteEnabled && remote.error
                    ? "CONNECTION ERROR"
                    : failure ? "MATCH STOPPED"
                    : frame.status === "finished" && frame.winner
                      ? <span className="replay-result">{frame.winner.toUpperCase()} WINS</span>
                    : index === end
                  ? "REPLAY COMPLETE"
                  : playing
                    ? "PLAYING"
                    : "PAUSED"}
              </b>
              <span>
                {roomRecording ? `Event ${index} / ${end}` : `Event ${index} / ${end}`}
              </span>
            </div>
            <button className="text-link" onClick={() => setFlipped(!flipped)}>
              Flip board ⇄
            </button>
          </div>
          <div className="board-stage">
            <Board
              replay={replay}
              animationMs={animateStep ? motionTiming(speed).durationMs : 0}
              frame={frame}
              selected={selected}
              onSelect={setSelected}
              flipped={flipped}
            />
          </div>
          <div className="playback">
            <div className="seek-label">
              <span>EVENT {index.toString().padStart(2, "0")}</span>
              <small>{end} recorded events · viewing speed only</small>
            </div>
            <input
              aria-label="Replay move"
              type="range"
              min="0"
              max={end}
              value={index}
              onChange={(e) => seek(Number(e.target.value))}
            />
            <div className="transport">
              <div>
                <button
                  aria-label="First move"
                  onClick={() => seek(0)}
                  disabled={!index}
                >
                  |◀
                </button>
                <button
                  aria-label="Previous move"
                  onClick={() => seek(index - 1)}
                  disabled={!index}
                >
                  ◀
                </button>
                <button
                  className="play-button"
                  aria-label={playing ? "Pause replay" : "Play replay"}
                  onClick={() => {
                    if (index === end) {setAnimateStep(false);setIndex(0);}
                    setPlaying(!playing);
                  }}
                >
                  {playing ? "Ⅱ" : "▶"}
                </button>
                <button
                  aria-label="Next move"
                  onClick={() => seek(index + 1)}
                  disabled={index === end}
                >
                  ▶
                </button>
                <button
                  aria-label="Last move"
                  onClick={() => seek(end)}
                  disabled={index === end}
                >
                  ▶|
                </button>
              </div>
              <label>
                Speed{" "}
                <select
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                >
                  {[0.5, 1, 2, 4].map((s) => (
                    <option key={s} value={s}>
                      {s}×
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </section>
        <aside className="log-sidebar">
          <div className="log-tabs">
            {["events", "output"].map((t) => (
              <button
                key={t}
                className={tab === t ? "active" : ""}
                onClick={() => setTab(t)}
              >
                {t === "events" ? "Move log" : "Bot output"}
              </button>
            ))}
          </div>
          <div className="log-content">
            {index > 199 && tab === "events" && <small>Showing the latest 200 events. Use the timeline to inspect earlier events.</small>}
            {tab === "events" ? (
              replay.frames
                .slice(Math.max(0,index - 199), index + 1)
                .map((f, i) => ({ frame: f, index: Math.max(0,index - 199)+i }))
                .filter(({ frame: f }) => f.event !== "match-end")
                .map(({ frame: f, index: i }) => (
                  <button
                    key={i}
                    className={`log-entry ${i === index ? "current" : ""}`}
                    onClick={() => seek(i)}
                  >
                    <small>
                      {String(i).padStart(3, "0")} /{" "}
                      {f.side?.toUpperCase() || "JUDGE"}
                    </small>
                    <span>
                      {f.event}
                      {f.event === "match-end" && f.winner && (
                        <strong className="log-result">{f.winner} wins</strong>
                      )}
                    </span>
                  </button>
                ))
                .reverse()
            ) : (
              <div className="terminal">
                <p>&gt; {roomRecording ? "room output channel" : "demo output channel"}</p>
                <pre>{frame.output ? (typeof frame.output === "string" ? frame.output : JSON.stringify(frame.output,null,2)) : "No stdout captured for this move."}</pre>
                <p>
                  The production judge may provide stdout and stderr per move.
                </p>
              </div>
            )}
          </div>
          <div className="log-footer">
            Log-driven simulation
            <br />
            {frame.status === "finished"
              ? `${frame.winner ? `${frame.winner} wins` : "Draw"} · match complete`
              : roomRecording
                ? "Timed human match · in progress"
                : "Match in progress"}
          </div>
        </aside>
      </div>
    </>
  );
}
export function Rankings() {
  const [query, setQuery] = useState(""),
    [language, setLanguage] = useState("All"),
    [sort, setSort] = useState("elo");
  const filtered = ranks
    .filter(
      (r) =>
        r[0].toLowerCase().includes(query.toLowerCase()) &&
        (language === "All" || r[2] === language),
    )
    .sort((a, b) => (sort === "elo" ? b[1] - a[1] : a[0].localeCompare(b[0])));
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">SEASON 2026 / SAMPLE STANDINGS</span>
          <h1>THE LEADERBOARD.</h1>
        </div>
        <Pixel kind="trophy" className="heading-sprite" />
      </div>
      <div className="filters">
        <label>
          Find a team
          <input
            placeholder="Search team name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label>
          Language
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            {["All", "Java", "Python", "C"].map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </label>
        <label>
          Sort by
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="elo">Highest Elo</option>
            <option value="name">Team name</option>
          </select>
        </label>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Team</th>
              <th>Language</th>
              <th>Elo</th>
              <th>Wins</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr
                key={r[0]}
                className={r[0] === "Atlas Team" ? "your-team" : ""}
              >
                <td>{String(ranks.indexOf(r) + 1).padStart(2, "0")}</td>
                <td>
                  <Pixel side={ranks.indexOf(r) % 2 ? "black" : "white"} />
                  {r[0]}
                  {r[0] === "Atlas Team" && <small>YOU</small>}
                </td>
                <td>{r[2]}</td>
                <td>
                  <b>{r[1]}</b>
                </td>
                <td>{r[3]}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && (
          <p className="empty">No teams match those filters.</p>
        )}
      </div>
      <p className="muted">
        Sample Elo values for layout evaluation. Real rankings will come from
        your tournament API.
      </p>
    </>
  );
}
function openMatch(matchId){
 const url=new URL(window.location.href);url.searchParams.delete('room');url.searchParams.set('match',matchId);url.hash='match';
 window.history.pushState(null,'',url.href);
 window.dispatchEvent(new HashChangeEvent('hashchange'));
}
export function Submission({ bot, save, prepare }) {
  const [white, setWhite] = useState(pythonExample),
    [black, setBlack] = useState(pythonExample),
    [whiteLanguage, setWhiteLanguage] = useState("python"),
    [blackLanguage, setBlackLanguage] = useState("python"),
    [error, setError] = useState(""),
    [matchId, setMatchId] = useState(""),
    [busy, setBusy] = useState(false);
  const handedOff=useRef(false);
  const [spec,setSpec] = useState(null), [mapId,setMapId] = useState('standard-9'), [maxTurns,setMaxTurns] = useState(31), [firstSide,setFirstSide] = useState('white');
  useEffect(()=>{
    if(window.__OFFLINE_PREVIEW__) return;
    const controller=new AbortController();
    getGameSpecification(controller.signal).then(setSpec).catch(()=>{});
    return ()=>controller.abort();
  },[]);
  const maps=spec?.maps || bundledMaps;
  const submit = async (e) => {
    e.preventDefault();
    if (!white.trim() || !black.trim()) {
      setError("Paste source code for both players.");
      return;
    }
    setError("");
    setBusy(true);prepare('connect');
    try {
      if(window.__OFFLINE_PREVIEW__){
        await new Promise(r=>setTimeout(r,1200));prepare('upload');
        await new Promise(r=>setTimeout(r,1200));prepare('queued');
        await new Promise(r=>setTimeout(r,900));
        const size=maps.find(m=>m.id===mapId)?.config.boardSize||9;
        const sample=samples.find(s=>s.replay.boardSize===size)||samples[0];
        savePreviewSubmission({id:'preview-submitted',matchId:'PREVIEW-SUBMITTED',title:'Preview submitted match',language:`${whiteLanguage.toUpperCase()} / ${blackLanguage.toUpperCase()}`,mapName:`${size}×${size}`,createdAt:new Date().toISOString(),status:'finished',sampleId:sample.id,preview:true});
        handedOff.current=true;prepare('queued','PREVIEW-SUBMITTED');openMatch('PREVIEW-SUBMITTED');return;
      }
      await waitForBackend();prepare('upload');
      const [whiteSubmission, blackSubmission] = await Promise.all([
        submitBot("web-white", whiteLanguage, white),
        submitBot("web-black", blackLanguage, black),
      ]);
      prepare('queued');
      const match = await createBotMatch(whiteSubmission.id, blackSubmission.id, {gameId:'ottv2',mapId,config:{maxTurns:Number(maxTurns),firstSide}});
      setMatchId(match.id);
      writeHistory({id:match.id,matchId:match.id,title:`Match ${match.id}`,language:`${whiteLanguage.toUpperCase()} / ${blackLanguage.toUpperCase()}`,mapName:maps.find(m=>m.id===mapId)?.config.mapName||mapId,createdAt:new Date().toISOString(),status:match.status||'queued',whiteSubmissionId:whiteSubmission.id,blackSubmissionId:blackSubmission.id},historyStorage());
      save({
        ...bot,
        language: `${whiteLanguage.toUpperCase()} / ${blackLanguage.toUpperCase()}`,
        file: `${match.id} submissions`,
      });
      handedOff.current=true;
      prepare('queued',match.id);openMatch(match.id);
    } catch (submitError) {
      prepare(null);setError(submitError.message);
    } finally {
      if(!handedOff.current)setBusy(false);
    }
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">MY TEAM / BOT SUBMISSION</span>
          <h1>YOUR NEXT MOVE.</h1>
        </div>
        <Pixel className="heading-sprite" />
      </div>
      <div className="submission-layout">
        <form className="card submission-form" onSubmit={submit}>
          <h2>SUBMIT A BOT</h2>
          <p>{window.__OFFLINE_PREVIEW__?'Try the submission loading flow. This preview opens a recorded sample and does not execute your code.':'Choose a language and map. The backend validates moves and records the result.'}</p>
          <label>Map<select value={mapId} onChange={e=>setMapId(e.target.value)}>{maps.map(m=><option key={m.id} value={m.id}>{m.config.mapName}</option>)}</select></label>
          <label>Turn limit<input type="number" min="1" max="10000" value={maxTurns} onChange={e=>setMaxTurns(e.target.value)} required /></label>
          <label>First side<select value={firstSide} onChange={e=>setFirstSide(e.target.value)}><option value="white">White</option><option value="black">Black</option></select></label>
          <label>
            White language
            <select value={whiteLanguage} onChange={(e) => {if(white === botExamples[whiteLanguage]) setWhite(botExamples[e.target.value]);setWhiteLanguage(e.target.value);}}>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
              <option value="python">Python</option>
            </select>
          </label>
          <label>
            White player
            <textarea value={white} required rows="10" onChange={(e) => setWhite(e.target.value)} placeholder={'C++: choose_move(state)\nPython: read_state() / yield_turn(...)'} />
          </label>
          <label>
            Black language
            <select value={blackLanguage} onChange={(e) => {if(black === botExamples[blackLanguage]) setBlack(botExamples[e.target.value]);setBlackLanguage(e.target.value);}}>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
              <option value="python">Python</option>
            </select>
          </label>
          <label>
            Black player
            <textarea value={black} required rows="10" onChange={(e) => setBlack(e.target.value)} placeholder={'C++: choose_move(state)\nPython: read_state() / yield_turn(...)'} />
          </label>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <Button disabled={busy || !white.trim() || !black.trim()} type="submit">
            {busy ? "Preparing match…" : window.__OFFLINE_PREVIEW__ ? "Preview submission flow ↗" : "Submit and run match ↗"}
          </Button>
          {matchId && <p className="status">Match created: {matchId}</p>}
          <small>Each program is compiled and run as a temporary server process. Use this only on a trusted development server.</small>
        </form>
        <aside>
          <article className="card">
            <span className="eyebrow">CURRENT LOCAL VERSION</span>
            <div className="bot-summary">
              <Pixel />
              <div>
                <h2>
                  {bot.name} v{bot.version}
                </h2>
                <p>
                  {bot.language} · {bot.file}
                </p>
                <span className="status">
                  <i />
                  Saved locally
                </span>
              </div>
            </div>
          </article>
          <article className="submission-tip">
            <span className="eyebrow">BEFORE YOU SUBMIT</span>
            <h3>THINK AHEAD.</h3>
            <p>
              Use the SDK matching the current rules version. Test your bot
              against different maps and starting sides.
            </p>
            <a href="#rules">Read game specification ↗</a>
          </article>
        </aside>
      </div>
    </>
  );
}
export function Tournament({ go }) {
  const [round, setRound] = useState("Round of 16");
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">SEASON 2026 / DEMO BRACKET</span>
          <h1>THE ROAD TO GLORY.</h1>
        </div>
        <Pixel kind="flag" className="heading-sprite" />
      </div>
      <section className="tournament-banner">
        <div>
          <h2>WEEKLY BOT CUP</h2>
          <p>
            Submit by 21:00 at the weekly cutoff. The weekday is configured by
            the organizer.
          </p>
        </div>
        <Button onClick={() => go("submit")}>Prepare your bot ↗</Button>
      </section>
      <div className="round-tabs">
        {["Round of 16", "Quarterfinals", "Semifinals", "Final"].map((r) => (
          <button
            className={round === r ? "active" : ""}
            key={r}
            onClick={() => setRound(r)}
          >
            {r}
          </button>
        ))}
      </div>
      <div className="bracket-grid">
        {(round === "Round of 16"
          ? ranks
          : round === "Quarterfinals"
            ? ranks.slice(0, 4)
            : round === "Semifinals"
              ? ranks.slice(0, 2)
              : [ranks[0]]
        ).map((r, i) => (
          <article className="bracket-card" key={r[0]}>
            <div className="card-title">
              <span>MATCH {String(i + 1).padStart(2, "0")}</span>
              <small>{i === 0 ? "DEMO REPLAY" : "PENDING"}</small>
            </div>
            <div>
              <Pixel />
              <b>{r[0]}</b>
              <span>{r[1]}</span>
            </div>
            <div>
              <Pixel side="black" />
              <b>{ranks[(i + 3) % ranks.length][0]}</b>
              <span>{ranks[(i + 3) % ranks.length][1]}</span>
            </div>
            <Button secondary onClick={() => go("match")}>
              {i === 0 ? "Watch demo match ▷" : "Open sample viewer ↗"}
            </Button>
          </article>
        ))}
      </div>
      <p className="muted">
        Bracket entries illustrate progressive rounds. Pairing and advancement
        are controlled by the tournament service.
      </p>
    </>
  );
}
export { OttRules as Rules } from "./games/ottv2/Rules.jsx";
