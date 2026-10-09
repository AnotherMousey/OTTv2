import React from "react";
import { Pixel } from "./Pixel";
export function Board({
  frame,
  compact = false,
  selected,
  onSelect,
  flipped = false,
  showCoordinates = true,
}) {
  const pos = (p) => ({
    left: `${((flipped ? 8 - p.x : p.x) * 100) / 9}%`,
    top: `${((flipped ? 8 - p.y : p.y) * 100) / 9}%`,
  });
  return (
    <div className={`board-wrap ${compact ? "compact" : ""}`}>
      <div className="board">
        {Array.from({ length: 81 }, (_, i) => {
          const x = i % 9,
            y = Math.floor(i / 9);
          return (
            <div
              key={i}
              className={`tile ${(x + y) % 2 ? "dark" : ""} ${(x === 8 && y === 0) || (x === 0 && y === 8) ? "goal" : ""}`}
            >
              {((x === 8 && y === 0) || (x === 0 && y === 8)) && (
                <Pixel kind="flag" />
              )}
            </div>
          );
        })}
        <div className="piece-layer">
          {frame.pieces.map((p) =>
            compact ? (
              <div className={`piece ${p.side}`} style={pos(p)} key={p.id}>
                <Pixel kind={p.type} side={p.side} />
              </div>
            ) : (
              <button
                key={p.id}
                className={`piece ${p.side} ${selected === p.id ? "selected" : ""}`}
                style={pos(p)}
                aria-pressed={selected === p.id}
                aria-label={`${p.side} ${p.type} at ${"abcdefghi"[p.x]}${9 - p.y}`}
                onClick={() => onSelect?.(p.id)}
              >
                <Pixel kind={p.type} side={p.side} />
              </button>
            ),
          )}
        </div>
      </div>
      {!compact && showCoordinates && (
        <>
          <div className="coords-x">
            {[...(flipped ? "ihgfedcba" : "abcdefghi")].map((c) => (
              <span key={c}>{c}</span>
            ))}
          </div>
          <div className="coords-y">
            {Array.from({ length: 9 }, (_, i) => (
              <span key={i}>{flipped ? i + 1 : 9 - i}</span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
