import React, {useState} from "react";
import {Pixel} from "./Pixel.jsx";
import {TYPES} from "./validate.js";
export function OttRules() {
  const [tab, setTab] = useState("Game rules");
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">GAME SPECIFICATION / CONFIGURABLE V2</span>
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
                  "Default 9×9; configured maps can use 5–26 rows and columns. The judge supplies map, pieces, targets and first side.",
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
                  "Reach the enemy source (default White: i9; Black: a1). Elimination is configurable: all enemy pieces by default, or all pieces of one type when enabled.",
                ],
                [
                  "05",
                  "MOVE LIMIT",
                  "The judge sets the turn limit. More remaining pieces wins at the limit; equal counts draw. Player clocks and a 2-second bot response deadline also apply.",
                ],
                [
                  "06",
                  "BOT COMPETITION",
                  "Players submit bots in Java, Python or C++. The judge runs matches and confirms results; the web renders the logs.",
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
              The frontend selects a game renderer by gameId and rendererVersion.
              Teams, submissions, tournament navigation, and rankings stay
              independent of game-specific rendering.
            </p>
            <div className="notice">
              SDK source is included under logic/sdk. Java, C++ and Python runners share the versioned board-size extension; the server validates every action.
            </div>
            <pre>{`// Integration points\nGET /api/games/current\nGET /api/tournaments/:id (proposed; not implemented)\nGET /api/rankings (proposed; not implemented)\nPOST /api/submissions\nGET /api/matches/:id/replay\n\nSupported bot languages: Java, Python, C++`}</pre>
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
                  protocolVersion: 2,
                  rendererVersion: "1",
                  gameId: "ottv2",
                  rulesVersion: "ottv2-configurable-v2",
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
              Open replay ↗
            </a>
          </>
        )}
      </div>
    </>
  );
}
