import React, { useEffect, useRef, useState } from "react";
import { Pixel } from "./Pixel.jsx";
import { Landscape } from "./ui.jsx";
import { useMotion } from "./MotionPreferences.jsx";

function useArtworkMotion(ref) {
  const { active, reduce } = useMotion();
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    if (!ref.current || !window.IntersectionObserver) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.03 },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref]);
  return { active: active && visible, reduce };
}

export function HeroTheatre() {
  const root = useRef(null),
    prop = useRef(null),
    impactTimer = useRef(null),
    animation = useRef(null);
  const [piece, setPiece] = useState("hammer"),
    [paused, setPaused] = useState(false),
    [strike, setStrike] = useState(false);
  const { active, reduce } = useArtworkMotion(root);
  useEffect(
    () => () => {
      clearTimeout(impactTimer.current);
      animation.current?.cancel();
    },
    [],
  );
  useEffect(() => {
    if (!active || paused) animation.current?.cancel();
  }, [active, paused]);
  function swing() {
    clearTimeout(impactTimer.current);
    setStrike(true);
    impactTimer.current = setTimeout(() => setStrike(false), 850);
    if (reduce || paused || !prop.current?.animate) return;
    animation.current?.cancel();
    animation.current = prop.current.animate(
      [
        { transform: "rotate(-20deg) translateY(-12px)" },
        { transform: "rotate(14deg) translateY(12px)", offset: 0.4 },
        { transform: "rotate(-7deg) translateY(0)" },
      ],
      { duration: 700, easing: "cubic-bezier(.22,1,.36,1)" },
    );
  }
  function look(event) {
    if (reduce || paused || event.pointerType === "touch") return;
    const box = root.current.getBoundingClientRect();
    root.current.style.setProperty(
      "--look-x",
      ((event.clientX - box.left) / box.width - 0.5) * 15 + "px",
    );
    root.current.style.setProperty(
      "--look-y",
      ((event.clientY - box.top) / box.height - 0.5) * 10 + "px",
    );
  }
  function resetLook() {
    root.current.style.setProperty("--look-x", "0px");
    root.current.style.setProperty("--look-y", "0px");
  }
  return (
    <div
      ref={root}
      className={`home-artwork ${active && !paused ? "" : "artwork-paused"}`}
      data-piece={piece}
      onPointerMove={look}
      onPointerLeave={resetLook}
    >
      <Landscape className={`tall home-theatre ${strike ? "strike" : ""}`}>
        <button
          className="theatre-pause"
          type="button"
          aria-label={paused ? "Resume artwork motion" : "Pause artwork motion"}
          aria-pressed={paused}
          onClick={() => {
            setPaused((value) => !value);
            animation.current?.cancel();
            resetLook();
          }}
        >
          {paused ? "▶" : "Ⅱ"}
        </button>
        <button
          className="hero-prop"
          type="button"
          onClick={swing}
          aria-label={
            piece === "hammer"
              ? "Swing the rock hammer"
              : piece === "paper"
                ? "Flutter the paper"
                : "Turn the scissors"
          }
        >
          <span className="prop-sway" ref={prop}>
            <Pixel kind={piece} side={piece === "paper" ? "black" : "white"} />
          </span>
        </button>
        <div className="impact-floor" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="art-label">
          ONE BOARD
          <br />
          ENDLESS STRATEGIES
        </div>
        <div
          className="prop-select"
          role="group"
          aria-label="Choose artwork piece"
        >
          {[
            ["hammer", "ROCK"],
            ["paper", "PAPER"],
            ["scissors", "SCISSORS"],
          ].map(([kind, label]) => (
            <button
              key={kind}
              type="button"
              aria-pressed={piece === kind}
              onClick={() => {
                setPiece(kind);
                animation.current?.cancel();
              }}
            >
              <Pixel kind={kind} side={kind === "paper" ? "black" : "white"} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </Landscape>
    </div>
  );
}

const starts = [
  { kind: "hammer", row: 7, col: 1, side: "white" },
  { kind: "paper", row: 7, col: 2, side: "white" },
  { kind: "scissors", row: 7, col: 3, side: "white" },
  { kind: "hammer", row: 1, col: 5, side: "black" },
  { kind: "paper", row: 1, col: 6, side: "black" },
  { kind: "scissors", row: 1, col: 7, side: "black" },
];
const paths = [
  [
    [7, 1],
    [6, 1],
    [5, 1],
    [5, 2],
    [6, 2],
    [7, 2],
  ],
  [
    [1, 5],
    [2, 5],
    [3, 5],
    [3, 6],
    [2, 6],
    [1, 6],
  ],
];
function MiniBoard({ active }) {
  const tick = useRef(0);
  const [pieces, setPieces] = useState(starts);
  function step() {
    const turn = ++tick.current;
    setPieces((current) =>
      current.map((piece, index) => {
        if (index !== 0 && index !== 3) return piece;
        const path = paths[index === 0 ? 0 : 1],
          [row, col] = path[turn % path.length];
        return { ...piece, row, col };
      }),
    );
  }
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(step, 1800);
    return () => clearInterval(timer);
  }, [active]);
  function move(event) {
    const tile = event.target.closest("[data-row]");
    if (!tile) {
      step();
      return;
    }
    const row = Number(tile.dataset.row),
      col = Number(tile.dataset.col);
    // This is home artwork only. No match, result or game state is mutated.
    if (
      pieces.some(
        (piece, index) => index !== 0 && piece.row === row && piece.col === col,
      )
    )
      return;
    setPieces((current) =>
      current.map((piece, index) => (index ? piece : { ...piece, row, col })),
    );
  }
  return (
    <button
      className="identity-mini-board"
      type="button"
      onClick={move}
      aria-label="Move the gold piece in the home artwork"
    >
      <svg
        className="home-mini-board-svg"
        viewBox="0 0 180 180"
        aria-hidden="true"
      >
        {Array.from({ length: 81 }, (_, index) => {
          const row = Math.floor(index / 9),
            col = index % 9;
          return (
            <rect
              key={index}
              className={`mini-square ${(row + col) % 2 ? "odd" : ""}`}
              data-row={row}
              data-col={col}
              x={col * 20}
              y={row * 20}
              width="20"
              height="20"
            />
          );
        })}
        {pieces.map((piece, index) => (
          <g
            key={index}
            className="mini-piece"
            style={{
              transform: `translate(${piece.col * 20 + 1}px,${piece.row * 20 + 1}px)`,
            }}
          >
            <foreignObject width="18" height="18">
              <div xmlns="http://www.w3.org/1999/xhtml" className="mini-piece-art">
                <Pixel kind={piece.kind} side={piece.side} />
              </div>
            </foreignObject>
          </g>
        ))}
      </svg>
    </button>
  );
}

export function HomeHighlights() {
  const root = useRef(null),
    greetingTimer = useRef(null),
    burstTimer = useRef(null),
    serial = useRef(0);
  const [greeting, setGreeting] = useState(false),
    [burst, setBurst] = useState(null);
  const { active, reduce } = useArtworkMotion(root);
  const [paused, setPaused] = useState(false);
  useEffect(
    () => () => {
      clearTimeout(greetingTimer.current);
      clearTimeout(burstTimer.current);
    },
    [],
  );
  function hello() {
    clearTimeout(greetingTimer.current);
    setGreeting(true);
    greetingTimer.current = setTimeout(() => setGreeting(false), 2300);
  }
  function celebrate() {
    clearTimeout(burstTimer.current);
    if (reduce) return;
    setBurst(++serial.current);
    burstTimer.current = setTimeout(() => setBurst(null), 1100);
  }
  return (
    <div
      className={`art-row home-highlights ${active && !paused ? "" : "artwork-paused"}`}
      ref={root}
    >
      <Landscape className={`bot-land ${greeting ? "greet" : ""}`}>
        <button
          className="art-hit-target"
          type="button"
          onClick={hello}
          aria-label="Say hello to the arena bot"
        />
        <span className="bot-walk">
          <Pixel />
        </span>
        <span className="bot-greeting" aria-hidden="true">
          &lt; hello /&gt;
        </span>
      </Landscape>
      <Landscape className="gold trophy-land">
        <button
          className="art-hit-target"
          type="button"
          onClick={celebrate}
          aria-label="Celebrate with the trophy"
        />
        <span className="trophy-sway">
          <Pixel kind="trophy" />
        </span>
        <span className="trophy-glint" aria-hidden="true">
          ✦
        </span>
        {burst !== null &&
          Array.from({ length: 22 }, (_, index) => (
            <i
              key={`${burst}-${index}`}
              className="celebration-bit"
              style={{
                background: ["#fff8df", "#ffd33d", "#f5a641", "#458de0"][
                  index % 4
                ],
                "--burst-x": `${Math.cos(index * 2.4) * (40 + index * 2)}px`,
                "--burst-y": `${-35 + Math.sin(index * 2.4) * 65}px`,
                "--burst-rotate": `${index * 47}deg`,
              }}
            />
          ))}
      </Landscape>
      <div className="mini-board home-mini-wrap">
        <MiniBoard active={active && !paused} />
        <button
          className="highlights-pause"
          type="button"
          aria-label={
            paused ? "Resume highlight motion" : "Pause highlight motion"
          }
          aria-pressed={paused}
          onClick={() => setPaused((value) => !value)}
        >
          {paused ? "▶" : "Ⅱ"}
        </button>
      </div>
    </div>
  );
}
