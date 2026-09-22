import { PIECE_ICONS, PIECE_LABELS, PLAYERS } from "../game/constants.js";

export default function Piece({ piece, selected }) {
  const playerClass = piece.player === PLAYERS.ONE ? "piece--p1" : "piece--p2";

  return (
    <div
      className={`piece ${playerClass} ${selected ? "piece--selected" : ""}`}
      title={`${piece.player === PLAYERS.ONE ? "Player 1" : "Player 2"} · ${PIECE_LABELS[piece.type]}`}
      aria-label={`${piece.player} ${piece.type}`}
    >
      <span className="piece__icon" aria-hidden="true">{PIECE_ICONS[piece.type]}</span>
    </div>
  );
}
