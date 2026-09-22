import Piece from "./Piece.jsx";
import { TARGETS } from "../game/constants.js";
import { positionToCoordinate } from "../utils/coordinates.js";

export default function Square({
  row,
  col,
  piece,
  selected,
  validMove,
  lastMove,
  onClick,
}) {
  const coordinate = positionToCoordinate(row, col);
  const isLight = (row + col) % 2 === 0;
  const isTarget = coordinate === TARGETS.white.coordinate || coordinate === TARGETS.black.coordinate;
  const isLastMove = lastMove && (
    (lastMove.from.row === row && lastMove.from.col === col) ||
    (lastMove.to.row === row && lastMove.to.col === col)
  );

  return (
    <button
      type="button"
      className={[
        "square",
        isLight ? "square--light" : "square--dark",
        selected ? "square--selected" : "",
        validMove?.kind === "move" ? "square--valid" : "",
        validMove?.kind === "attack" ? "square--attack" : "",
        isLastMove ? "square--last" : "",
        isTarget ? "square--target" : "",
      ].filter(Boolean).join(" ")}
      onClick={onClick}
      aria-label={`Square ${coordinate}`}
    >
      {isTarget && <span className="target-crown" aria-hidden="true">♛</span>}
      {piece && <Piece piece={piece} selected={selected} />}
      {validMove?.kind === "move" && <span className="move-dot" aria-hidden="true" />}
      {validMove?.kind === "attack" && <span className="attack-ring" aria-hidden="true" />}
      <span className="square__coord">{coordinate}</span>
    </button>
  );
}
