import { PLAYERS } from "../game/constants.js";
import MoveHistory from "./MoveHistory.jsx";

export default function GameSidebar({
  game,
  role,
  onlineCount,
  spectatorCount,
  canTakeSeat,
  onTakeSeat,
  onReset,
  onLeave,
}) {
  const turnLabel = game.turn === PLAYERS.ONE ? "White" : "Black";
  const roleLabel = role === "spectator" ? "Spectator" : role === PLAYERS.ONE ? "White" : "Black";

  async function copyRoom() {
    await navigator.clipboard?.writeText(game.roomId);
  }

  return (
    <aside className="game-sidebar">
      <section className="sidebar-card">
        <div className="sidebar-card__heading">
          <h3>Game info</h3>
          <span className={`game-status game-status--${game.status}`}>{game.status}</span>
        </div>

        <dl className="info-grid">
          <div><dt>Current turn</dt><dd className="turn-pulse">{turnLabel}</dd></div>
          <div><dt>Move</dt><dd>{game.moveNumber}</dd></div>
          <div><dt>Your role</dt><dd>{roleLabel}</dd></div>
          <div><dt>Online</dt><dd>{onlineCount}</dd></div>
          <div><dt>Spectators</dt><dd>{spectatorCount}</dd></div>
        </dl>

        <div className="room-box">
          <span>Room ID</span>
          <strong>{game.roomId}</strong>
          <button type="button" className="mini-button" onClick={copyRoom}>Copy</button>
        </div>
      </section>

      {role === "spectator" && canTakeSeat && (
        <section className="sidebar-card">
          <h3>Seat available</h3>
          <p className="muted">A stored player is offline. You can take that seat to continue the match.</p>
          <button type="button" className="button button--secondary button--full" onClick={onTakeSeat}>
            Take offline seat
          </button>
        </section>
      )}

      <MoveHistory history={game.history} />

      <section className="sidebar-actions">
        <button type="button" className="button button--secondary" onClick={onReset}>Reset game</button>
        <button type="button" className="button button--ghost" onClick={onLeave}>Leave room</button>
      </section>
    </aside>
  );
}
