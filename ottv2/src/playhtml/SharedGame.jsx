import { useEffect, useMemo, useState } from "react";
import Board from "../components/Board.jsx";
import GameOverModal from "../components/GameOverModal.jsx";
import GameSidebar from "../components/GameSidebar.jsx";
import PlayerPanel from "../components/PlayerPanel.jsx";
import { FILES, PLAYERS } from "../game/constants.js";

function getPerspective() {
  return new URLSearchParams(window.location.search).get("color")?.toLowerCase() === "black"
    ? PLAYERS.TWO
    : PLAYERS.ONE;
}

function getRoomId() {
  return new URLSearchParams(window.location.search).get("room")?.toUpperCase() || "";
}

function coordinateToPosition(square) {
  return { row: Number(square.slice(1)), col: FILES.indexOf(square[0]) };
}

function toGameData(state, roomId) {
  const pieces = {};
  state.board.flat().forEach((piece) => {
    if (!piece) return;
    pieces[piece.id] = {
      ...piece,
      player: piece.color,
      ...coordinateToPosition(piece.square),
      alive: true,
    };
  });

  const lastMove = state.history.at(-1);
  return {
    roomId,
    status: state.status === "active" ? "playing" : "finished",
    players: { player1: { name: "White" }, player2: { name: "Black" } },
    turn: state.currentTurn,
    pieces,
    winner: state.winner,
    winReason: state.winner ? getWinReason(state) : null,
    moveNumber: state.history.length,
    history: state.history.map(formatHistoryEntry),
    lastMove: lastMove ? {
      from: coordinateToPosition(lastMove.from),
      to: coordinateToPosition(lastMove.to),
    } : null,
    clocks: { white: state.whiteTimeMs, black: state.blackTimeMs },
  };
}

function getWinReason(state) {
  const lastMove = state.history.at(-1);
  if (lastMove?.result === "goal") return `${state.winner} reached the target square.`;
  if (state.whiteTimeMs === 0 || state.blackTimeMs === 0) return "The opponent ran out of time.";
  return "All opponent pieces were eliminated.";
}

function formatHistoryEntry(move, index) {
  const result = move.result === "attacker" ? "capture" : move.result === "defender" ? "defended" : move.result || "move";
  return `${index + 1}. ${move.player} ${move.piece}: ${move.from} → ${move.to} (${result})`;
}

async function requestState(roomId, perspective) {
  const response = await fetch(`/api/game/state?room=${encodeURIComponent(roomId)}&view=${perspective}`);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Could not load game state.");
  return payload;
}

export default function SharedGame() {
  const role = getPerspective();
  const roomId = getRoomId();
  const [game, setGame] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadState() {
      try {
        const state = await requestState(roomId, role);
        if (cancelled) return;
        setGame(toGameData(state, roomId));
        setError("");
      } catch (requestError) {
        if (!cancelled) setError(requestError.message);
      }
    }

    loadState();
    const timer = window.setInterval(loadState, 1000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [role, roomId]);

  const online = useMemo(() => ({ white: true, black: true }), []);

  async function handleMove(pieceId, target) {
    const piece = game.pieces[pieceId];
    const to = `${FILES[target.col]}${target.row}`;
    const response = await fetch("/api/game/move", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, from: piece.square, to }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Move rejected.");
      return;
    }
    setGame(toGameData(payload.state, roomId));
    setError("");
  }

  async function resetGame() {
    const response = await fetch(`/api/game/new?room=${encodeURIComponent(roomId)}`, { method: "POST" });
    const payload = await response.json();
    setGame(toGameData(payload.state, roomId));
  }

  async function resign() {
    const response = await fetch("/api/game/forfeit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, color: role }),
    });
    const payload = await response.json();
    setGame(toGameData(payload.state, roomId));
  }

  if (!game) return <div className="loading-screen">{error || "Connecting to OTT backend…"}</div>;

  return (
    <main id="ottv2-game-shell" className="game-page">
      <header className="game-header">
        <div><div className="brand-mark brand-mark--small">OTT<span>V2</span></div><p>Backend-connected strategy match</p></div>
        <div className="header-room">Play as <strong>{role}</strong> · Room <strong>{roomId}</strong></div>
      </header>
      {error && <p className="error-banner">{error}</p>}
      <div className="game-layout">
        <section className="game-main-column">
          <PlayerPanel player={PLAYERS.TWO} seat={game.players.player2} pieces={game.pieces} online={online.black} activeTurn={game.status === "playing" && game.turn === PLAYERS.TWO} role={role} clock={game.clocks.black} />
          <Board game={game} role={role} onMove={handleMove} orientation={role} />
          <PlayerPanel player={PLAYERS.ONE} seat={game.players.player1} pieces={game.pieces} online={online.white} activeTurn={game.status === "playing" && game.turn === PLAYERS.ONE} role={role} clock={game.clocks.white} />
        </section>
        <GameSidebar game={game} role={role} onlineCount={2} spectatorCount={0} canTakeSeat={false} onTakeSeat={() => {}} onReset={resetGame} onLeave={resign} />
      </div>
      <GameOverModal winner={game.winner} reason={game.winReason} onPlayAgain={resetGame} onBackToLobby={resign} />
    </main>
  );
}
