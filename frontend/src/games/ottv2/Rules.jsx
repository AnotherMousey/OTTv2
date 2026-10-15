import React, {useState} from "react";
import {Pixel} from "./Pixel.jsx";
import {TYPES} from "./validate.js";
import {API_LANGUAGES} from "./apiReference.js";
import "./apiReference.css";

const RULES = [
  ["01", "THE BOARD", "Default 9×9; configured maps can use 9–20 rows and columns. The judge supplies map, pieces, targets and first side."],
  ["02", "MOVEMENT", "A piece moves one square in any of eight directions. Pieces on the same side block one another."],
  ["03", "CAPTURES", "Hammer (rock) beats scissors. Scissors beat paper. Paper beats hammer. Equal types block; they cannot capture."],
  ["04", "VICTORY", "Reach the enemy source (default White: i9; Black: a1) or eliminate every enemy piece."],
  ["05", "MOVE LIMIT", "The judge sets the turn limit. More remaining pieces wins at the limit; equal counts draw. Each bot move has a per-move thinking limit."],
  ["06", "BOT COMPETITION", "Players submit bots in Java, Python or C++. The judge runs matches and confirms results; the web renders the logs."],
];

function ApiTree({language}) {
  return (
    <div className="api-tree">
      <div className="api-meta">
        <span><b>{language.module}</b></span>
      </div>
      <section className="api-entry">
        <span className="eyebrow">ENTRY POINT</span>
        <code className="api-signature">{language.entry.signature}</code>
        <p>{language.entry.doc}</p>
      </section>
      <ul className="api-root" aria-label={`${language.label} API`}>
        {language.types.map((type) => (
          <li key={type.name}>
            <details>
              <summary>
                <span className="api-kind">{type.kind}</span>
                <span className="api-name">{type.name}</span>
                {type.alias && <span className="api-alias">alias {type.alias}</span>}
                <span className="api-doc">{type.doc}</span>
              </summary>
              <ul className="api-members">
                {type.members.map((m) => (
                  <li key={m.signature}>
                    <code>{m.signature}</code>
                    <span>{m.doc}</span>
                  </li>
                ))}
              </ul>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function OttRules() {
  const tabs = [...API_LANGUAGES.map((l) => l.label), "Game rules"];
  const [tab, setTab] = useState(tabs[0]);
  const language = API_LANGUAGES.find((l) => l.label === tab);
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">BOT API / C++ · JAVA · PYTHON</span>
          <h1>KNOW THE API.</h1>
        </div>
        <div className="rules-sprites">
          {TYPES.map((t) => (
            <Pixel kind={t} key={t} />
          ))}
        </div>
      </div>
      <div className="round-tabs">
        {tabs.map((t) => (
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
        {language ? (
          <>
            <h2>{language.label} SDK</h2>
            <ApiTree language={language} />
          </>
        ) : (
          <>
            <h2>SMALL MOVES. BIG CONSEQUENCES.</h2>
            <div className="rule-grid">
              {RULES.map(([n, t, d]) => (
                <article key={n}>
                  <span className="step-number">{n}</span>
                  <h3>{t}</h3>
                  <p>{d}</p>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
