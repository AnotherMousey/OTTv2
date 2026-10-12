import {AnimatedPieces} from "../../AnimatedPieces.jsx";
import React from "react";
function Pixel({kind, side}) { return <span style={{fontSize: kind === "flag" ? 18 : 24, color: side === "black" ? "#458de0" : "#f5a641", textShadow:"1px 1px #18221d"}}>{kind === "flag" ? "⚑" : "●"}</span>; }
export function Board({
  frame,
  replay,
  animationMs = 720,
  compact = false,
  selected,
  onSelect,
  flipped = false,
  showCoordinates = true,
}) {
  const width = replay?.board?.width ?? replay?.boardSize ?? 9;
  const height = replay?.board?.height ?? replay?.boardSize ?? 9;
  const goals = replay?.board?.goals ?? [{x: width - 1, y: 0}, {x: 0, y: height - 1}];
  const isGoal = (x, y) => goals.some(g => g.x === x && g.y === y);
  return (
    <div className={`board-wrap ${compact ? "compact" : ""}`} style={{"--board-width": width, "--board-height": height}}>
      <div className="board" style={{aspectRatio: `${width} / ${height}`}}>
        {Array.from({ length: width * height }, (_, i) => {
          const x = i % width,
            y = Math.floor(i / width);
          return (
            <div
              key={i}
              className={`tile ${(x + y) % 2 ? "dark" : ""} ${isGoal(x, y) ? "goal" : ""}`}
            >
              {(isGoal(x, y)) && (
                <Pixel kind="flag" />
              )}
            </div>
          );
        })}
        <AnimatedPieces key={replay?.matchId || replay?.mapName || 'demo'} frame={frame} width={width} height={height} flipped={flipped} compact={compact} selected={selected} onSelect={onSelect} Piece={Pixel} animationMs={animationMs}/>

      </div>
      {!compact && showCoordinates && (
        <>
          <div className="coords-x">
            {Array.from({length: width}, (_, i) => String.fromCharCode(97 + (flipped ? width - 1 - i : i))).map((c) => (
              <span key={c}>{c}</span>
            ))}
          </div>
          <div className="coords-y">
            {Array.from({ length: height }, (_, i) => (
              <span key={i}>{flipped ? i + 1 : height - i}</span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
