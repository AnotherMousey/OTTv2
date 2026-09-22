import { PIECE_ICONS, PIECE_LABELS, PIECE_TYPES, PLAYERS } from "../game/constants.js";
import { getRemainingPieces } from "../game/rules.js";

export default function PlayerPanel({ player, seat, pieces, online, activeTurn, role }) {
  const counts = getRemainingPieces(pieces, player);
  const label = player === PLAYERS.ONE ? "Player 1" : "Player 2";
  const isYou = role === player;

  return (
    <section className={`player-panel ${activeTurn ? "player-panel--active" : ""}`}>
      <div>
        <div className="player-panel__title-row">
          <h2>{label}</h2>
          {isYou && <span className="you-badge">YOU</span>}
        </div>
        <p className="player-panel__identity">
          <span className={`status-dot ${online ? "status-dot--online" : ""}`} />
          {seat?.name || (seat ? "Anonymous player" : "Empty seat")}
        </p>
      </div>
      <div className="piece-counts">
        {Object.values(PIECE_TYPES).map((type) => (
          <span key={type} title={PIECE_LABELS[type]}>
            {PIECE_ICONS[type]} {counts[type]}
          </span>
        ))}
      </div>
    </section>
  );
}
