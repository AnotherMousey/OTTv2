import { PLAYERS } from "../game/constants.js";

export default function GameOverModal({ winner, reason, onPlayAgain, onBackToLobby }) {
  if (!winner) return null;
  const winnerLabel = winner === PLAYERS.ONE ? "WHITE" : "BLACK";

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="game-over-modal" role="dialog" aria-modal="true" aria-labelledby="winner-title">
        <div className="winner-crown">♛</div>
        <p className="eyebrow">Match complete</p>
        <h2 id="winner-title">{winnerLabel} WINS</h2>
        <p className="winner-reason">{reason}</p>
        <div className="modal-actions">
          <button type="button" className="button button--primary" onClick={onPlayAgain}>Play again</button>
          <button type="button" className="button button--ghost" onClick={onBackToLobby}>Back to lobby</button>
        </div>
      </section>
    </div>
  );
}
