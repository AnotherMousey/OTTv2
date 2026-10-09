import React, { useEffect, useRef, useState } from "react";
import { demoReplay, parseReplay, TYPES } from "./replay";
import { Pixel } from "./Pixel";
import { Board } from "./Board";
import { useRoomReplay } from "./hooks/useRoomReplay.js";
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
            <span>C</span>
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
        <span>4,000-student target</span>
        <span>Elo rankings</span>
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
            <small>Atlas Team · Sample Elo 1789</small>
            <Button onClick={() => go("submit")}>Manage submission ↗</Button>
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
            <h3>LATEST MATCH</h3>
            <span>03</span>
          </div>
          <div className="match-preview">
            <Board
              frame={demoReplay.frames[8] || demoReplay.frames[0]}
              compact
            />
          </div>
          <div className="preview-caption">
            <span>
              Atlas <b>vs</b> Byte Knights
            </span>
            <small>DEMO REPLAY</small>
          </div>
          <Button onClick={() => go("match")}>Watch replay ▷</Button>
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
          ["01", "BUILD", "Use the game SDK in Java, Python, or C."],
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
export function Match({ notify }) {
  const roomId = new URLSearchParams(window.location.search).get("room");
  const [remoteEnabled, setRemoteEnabled] = useState(Boolean(roomId));
  const remote = useRoomReplay(roomId, remoteEnabled);
  const lastMatch = useRef(null);
  const [replay, setReplay] = useState(() => roomId ? {
    ...demoReplay, mode: "room-recording", rulesVersion: "legacy-timed",
    mapName: `Room ${roomId}`, teams: { white: "White player", black: "Black player" }, bots: undefined,
    frames: [{ pieces: [], event: "Loading recorded room snapshots…", side: "white" }],
  } : demoReplay),
    [index, setIndex] = useState(0),
    [playing, setPlaying] = useState(false),
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
          return i + 1;
        }),
      900 / speed,
    );
    return () => clearInterval(t);
  }, [playing, speed, end]);
  const seek = (i) => {
    setPlaying(false);
    setIndex(Math.max(0, Math.min(end, i)));
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
  const upload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      if (file.size > 5e6) throw Error("Replay must be under 5 MB.");
      const data = parseReplay(await file.text());
      setRemoteEnabled(false);
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
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">{roomRecording ? "RECORDED ROOM / HUMAN MATCH" : "RECORDED MATCH / ROUND OF 16"}</span>
          <h1>
            MATCH VIEWER<span className="yellow-dot">.</span>
          </h1>
        </div>
        <div className="heading-actions">
          <Button secondary onClick={() => input.current.click()}>
            Import replay
          </Button>
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
      {(error || (remoteEnabled && remote.error)) && (
        <p className="error" role="alert">
          {error || remote.error}
        </p>
      )}
      <div className="viewer">
        <aside className="team-sidebar">
          <div className="match-meta">
            <span className="eyebrow">OTTv2 / RULES {replay.rulesVersion}</span>
            <h3>{replay.mapName}</h3>
            <p>9 × 9 board · {roomRecording ? "5-minute player clocks" : `${replay.maxMoves} move limit`}</p>
            <small>First side: {replay.firstSide} · {roomRecording ? "server room" : "judge draw"}</small>
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
                {TYPES.map((t) => (
                  <div key={t}>
                    <Pixel kind={t} side={s} />
                    <strong>
                      {
                        frame.pieces.filter((p) => p.side === s && p.type === t)
                          .length
                      }
                    </strong>
                    <small>{t === "rock" ? "Hammer" : t}</small>
                  </div>
                ))}
              </div>
            </section>
          ))}
          <div className="inspector">
            <span className="eyebrow">PIECE INSPECTOR</span>
            {piece ? (
              <>
                <h3>{piece.type === "rock" ? "Hammer" : piece.type}</h3>
                <p>
                  {piece.side} · {"abcdefghi"[piece.x]}
                  {9 - piece.y}
                </p>
                <small>ID: {piece.id}</small>
              </>
            ) : (
              <p>Select a piece to inspect its position.</p>
            )}
          </div>
        </aside>
        <section className="arena">
          <div className="arena-toolbar">
            <div>
              <span className="status-dot" />
              <b>
                {remoteEnabled && remote.loading
                  ? "LOADING ROOM"
                  : remoteEnabled && remote.error
                    ? "CONNECTION ERROR"
                    : index === end
                  ? "REPLAY COMPLETE"
                  : playing
                    ? "PLAYING"
                    : "PAUSED"}
              </b>
              <span>
                {roomRecording ? `Event ${index} / ${end}` : `Move ${index} / ${replay.maxMoves}`}
              </span>
            </div>
            <button className="text-link" onClick={() => setFlipped(!flipped)}>
              Flip board ⇄
            </button>
          </div>
          <div className="board-stage">
            <Board
              frame={frame}
              selected={selected}
              onSelect={setSelected}
              flipped={flipped}
            />
          </div>
          <div className="playback">
            <div className="seek-label">
              <span>MOVE {index.toString().padStart(2, "0")}</span>
              <small>{end} recorded {roomRecording ? "events" : "moves"} · viewing speed only</small>
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
                    if (index === end) setIndex(0);
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
            {tab === "events" ? (
              replay.frames
                .slice(0, index + 1)
                .map((f, i) => (
                  <button
                    key={i}
                    className={`log-entry ${i === index ? "current" : ""}`}
                    onClick={() => seek(i)}
                  >
                    <small>
                      {String(i).padStart(3, "0")} /{" "}
                      {f.side?.toUpperCase() || "JUDGE"}
                    </small>
                    <span>{f.event}</span>
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
            {roomRecording ? `Timed human match · ${frame.status === "finished" ? `Winner: ${frame.winner || "draw"}` : "in progress"}` : "No execution time limit"}
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
export function Submission({ bot, save }) {
  const [name, setName] = useState(bot.name),
    [language, setLanguage] = useState(bot.language),
    [file, setFile] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const submit = (e) => {
    e.preventDefault();
    if (!file) {
      setError("Choose a bot source file first.");
      return;
    }
    const ext = { Java: ".java", Python: ".py", C: ".c" }[language];
    if (!file.name.endsWith(ext)) {
      setError(`Choose a ${ext} source file for ${language}.`);
      return;
    }
    if (file.size > 2e6) {
      setError("Please choose a source file under 2 MB.");
      return;
    }
    setError("");
    setBusy(true);
    setTimeout(() => {
      save({
        name: name.trim(),
        language,
        version: bot.version + 1,
        file: file.name,
      });
      setBusy(false);
      setFile(null);
    }, 450);
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
          <p>Save a source-file selection to this browser for preview.</p>
          <label>
            Bot name
            <input
              value={name}
              required
              maxLength={30}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            Language
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              {["Java", "Python", "C"].map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </label>
          <label className="file-drop">
            <Pixel kind="paper" />
            <strong>{file ? file.name : "CHOOSE SOURCE FILE"}</strong>
            <small>.java / .py / .c · max 2 MB</small>
            <input
              aria-label="Bot source file"
              type="file"
              accept=".java,.py,.c"
              onChange={(e) => {
                setFile(e.target.files[0]);
                setError("");
              }}
            />
          </label>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <Button disabled={busy || !name.trim()} type="submit">
            {busy ? "Saving…" : "Save demo submission ↗"}
          </Button>
          <small>
            Source stays on your device. This preview stores metadata only;
            compilation and judging require your backend.
          </small>
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
export function Rules() {
  const [tab, setTab] = useState("Game rules");
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">GAME SPECIFICATION / VERSION 2.1</span>
          <h1>KNOW THE BOARD.</h1>
        </div>
        <div className="rules-sprites">
          {TYPES.map((t) => (
            <Pixel kind={t} key={t} />
          ))}
        </div>
      </div>
      <div className="round-tabs">
        {["Game rules", "SDK integration", "Replay protocol"].map((t) => (
          <button
            key={t}
            className={t === tab ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="rules-content">
        {tab === "Game rules" ? (
          <>
            <h2>SMALL MOVES. BIG CONSEQUENCES.</h2>
            <div className="rule-grid">
              {[
                [
                  "01",
                  "THE BOARD",
                  "A 9×9 board, columns a–i and rows 1–9. The judge supplies the initial map and first side.",
                ],
                [
                  "02",
                  "MOVEMENT",
                  "A piece moves one square in any of eight directions. Pieces on the same side block one another.",
                ],
                [
                  "03",
                  "CAPTURES",
                  "Hammer (rock) beats scissors. Scissors beat paper. Paper beats hammer. Equal types block; they cannot capture.",
                ],
                [
                  "04",
                  "VICTORY",
                  "White targets i9; black targets a1. Enter your target or eliminate every opposing piece of one type.",
                ],
                [
                  "05",
                  "MOVE LIMIT",
                  "The judge sets the maximum moves. There is no game execution time limit. Replay speed only changes viewing speed.",
                ],
                [
                  "06",
                  "BOT COMPETITION",
                  "Players submit bots in Java, Python, or C. The judge runs matches and confirms results; the web renders the logs.",
                ],
              ].map(([n, t, d]) => (
                <article key={n}>
                  <span className="step-number">{n}</span>
                  <h3>{t}</h3>
                  <p>{d}</p>
                </article>
              ))}
            </div>
          </>
        ) : tab === "SDK integration" ? (
          <>
            <h2>ONE PORTAL. CHANGING GAMES.</h2>
            <p>
              The frontend selects a game renderer by gameId and rulesVersion.
              Teams, submissions, tournament navigation, and rankings stay
              independent of game-specific rendering.
            </p>
            <div className="notice">
              Your official SDK and repository URLs are not configured in this
              prototype. Add them when connecting the backend.
            </div>
            <pre>{`// Integration points\nGET /api/games/current\nGET /api/tournaments/:id\nGET /api/rankings\nPOST /api/submissions\nGET /api/matches/:id/replay\n\nSupported bot languages: Java, Python, C`}</pre>
          </>
        ) : (
          <>
            <h2>RENDER WHAT THE JUDGE RECORDED.</h2>
            <p>
              The viewer accepts an OTTv2 JSON replay with complete state
              snapshots. Export the included demo from Match viewer for a
              working example. Validation checks structure, board bounds, piece
              types, and duplicate positions; the judge remains responsible for
              rules and results.
            </p>
            <pre>
              {JSON.stringify(
                {
                  schemaVersion: 1,
                  gameId: "ottv2",
                  rulesVersion: "2.1",
                  boardSize: 9,
                  mapName: "Meadow 09",
                  maxMoves: 100,
                  firstSide: "white",
                  teams: { white: "Atlas Team", black: "Byte Knights" },
                  frames: [
                    {
                      event: "Judge initialized board",
                      pieces: [
                        {
                          id: "white-0",
                          side: "white",
                          type: "rock",
                          x: 0,
                          y: 8,
                        },
                      ],
                    },
                  ],
                },
                null,
                2,
              )}
            </pre>
            <a href="#match" className="text-link">
              Try the replay viewer ↗
            </a>
          </>
        )}
      </div>
    </>
  );
}
