import {AnimatedPieces} from "../../AnimatedPieces.jsx";
import React from "react";
import { Pixel } from "./Pixel";
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
  // Goals are ordered white target, black target; a source belongs to the opposing target's side.
  const sources = replay?.board?.sources ?? {white: goals[1] ?? {x:0,y:height-1}, black: goals[0] ?? {x:width-1,y:0}};
  const sourceSide = (x,y) => ['white','black'].find(side=>sources[side]?.x===x && sources[side]?.y===y);
  const isGoal = (x, y) => goals.some(g => g.x === x && g.y === y);
  return (
    <div className={`board-wrap ${compact ? "compact" : ""}`} style={{"--board-width": width, "--board-height": height}}>
      <div className="board" style={{aspectRatio: `${width} / ${height}`}}>
        {Array.from({ length: width * height }, (_, i) => {
          const displayX = i % width, displayY = Math.floor(i / width);
          const x = flipped ? width - 1 - displayX : displayX,
            y = flipped ? height - 1 - displayY : displayY;
          const side = sourceSide(x,y);
          return (
            <div
              key={i}
              className={`tile ${(x + y) % 2 ? "dark" : ""} ${isGoal(x, y) || side ? "goal" : ""} ${side ? `source ${side}` : ''}`}
              data-source-side={side}
            >
              {side && (
                <Pixel kind="flag" side={side}/>
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
