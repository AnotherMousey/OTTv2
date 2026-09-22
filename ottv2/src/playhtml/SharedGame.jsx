import { useEffect, useMemo, useState } from 'react';
import Board from '../components/Board.jsx';
import GameOverModal from '../components/GameOverModal.jsx';
import GameSidebar from '../components/GameSidebar.jsx';
import PlayerPanel from '../components/PlayerPanel.jsx';
import { FILES, PLAYERS } from '../game/constants.js';
import {
  forfeitRoom,
  getClientId,
  getRoomState,
  joinRoom,
  moveInRoom,
  resetRoom,
} from '../api/gameApi.js';

function coordinateToPosition(square) {
  return { row: Number(square.slice(1)), col: FILES.indexOf(square[0]) };
}

function getWinReason(state) {
  const lastMove = state.history.at(-1);
  if (lastMove?.result === 'goal') return `${state.winner} reached the target square.`;
  if (state.whiteTimeMs === 0 || state.blackTimeMs === 0) return 'The opponent ran out of time.';
  return 'The match is finished.';
}

function formatHistoryEntry(move, index) {
  const result = move.result === 'attacker'
    ? 'capture'
    : move.result === 'defender'
      ? 'defended'
      : move.result || 'move';
  return `${index + 1}. ${move.player} ${move.piece}: ${move.from} → ${move.to} (${result})`;
}

function toGameData(payload) {
  const { state, roomId, role, seats } = payload;
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
    role,
    seats,
    status: state.status === 'active' ? 'playing' : 'finished',
    players: {
      player1: seats.white ? { name: 'White player' } : null,
      player2: seats.black ? { name: 'Black player' } : null,
    },
    turn: state.currentTurn,
    pieces,
    winner: state.winner,
    winReason: state.winner ? getWinReason(state) : null,
    moveNumber: state.history.length,
    history: state.history.map(formatHistoryEntry),
    lastMove: lastMove
      ? { from: coordinateToPosition(lastMove.from), to: coordinateToPosition(lastMove.to) }
      : null,
    clocks: { white: state.whiteTimeMs, black: state.blackTimeMs },
  };
}

export default function SharedGame({ roomId }) {
  const clientId = useMemo(() => getClientId(), []);
  const [game, setGame] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function connect() {
      try {
        const payload = await joinRoom(roomId, clientId);
        if (!cancelled) {
          setGame(toGameData(payload));
          setError('');
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    }

    async function refresh() {
      try {
        const payload = await getRoomState(roomId, clientId);
        if (!cancelled) {
          setGame(toGameData(payload));
          setError('');
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    }

    connect();
    const timer = window.setInterval(refresh, 1000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [roomId, clientId]);

  async function handleMove(pieceId, target) {
    if (!game || !['white', 'black'].includes(game.role)) return;
    try {
      const piece = game.pieces[pieceId];
      const to = `${FILES[target.col]}${target.row}`;
      const payload = await moveInRoom(roomId, clientId, piece.square, to);
      setGame(toGameData(payload));
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }

  async function resetGame() {
    try {
      const payload = await resetRoom(roomId, clientId);
      setGame(toGameData(payload));
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }

  async function resign() {
    try {
      if (game && ['white', 'black'].includes(game.role) && game.status === 'playing') {
        const payload = await forfeitRoom(roomId, clientId);
        setGame(toGameData(payload));
      }
    } catch (err) {
      setError(err.message);
    }
  }

  function backToLobby() {
    window.location.assign(window.location.pathname);
  }

  if (!game) {
    return (
      <div className="loading-screen">
        <div>
          <strong>{error || `Joining ${roomId}…`}</strong>
          {error && <div style={{ marginTop: 16 }}><button className="button button--secondary" onClick={backToLobby}>Back to lobby</button></div>}
        </div>
      </div>
    );
  }

  const role = game.role;
  const boardRole = role === 'black' ? PLAYERS.TWO : PLAYERS.ONE;
  const online = { white: game.seats.white, black: game.seats.black };
  const shareUrl = window.location.href;

  return (
    <main id="ottv2-game-shell" className="game-page">
      <header className="game-header">
        <div>
          <div className="brand-mark brand-mark--small">OTT<span>V2</span></div>
          <p>Online multiplayer strategy match</p>
        </div>
        <div className="header-room">
          You are <strong>{role === 'spectator' ? 'Spectator' : role}</strong> · Room <strong>{game.roomId}</strong>
          <button className="mini-button header-copy" onClick={() => navigator.clipboard?.writeText(shareUrl)}>Copy invite</button>
        </div>
      </header>

      {error && <p className="error-banner">{error}</p>}

      <div className="game-layout">
        <section className="game-main-column">
          <PlayerPanel
            player={PLAYERS.TWO}
            seat={game.players.player2}
            pieces={game.pieces}
            online={online.black}
            activeTurn={game.status === 'playing' && game.turn === PLAYERS.TWO}
            role={role}
            clock={game.clocks.black}
          />
          <Board game={game} role={role} onMove={handleMove} orientation={boardRole} />
          <PlayerPanel
            player={PLAYERS.ONE}
            seat={game.players.player1}
            pieces={game.pieces}
            online={online.white}
            activeTurn={game.status === 'playing' && game.turn === PLAYERS.ONE}
            role={role}
            clock={game.clocks.white}
          />
        </section>

        <GameSidebar
          game={game}
          role={role}
          onlineCount={Number(online.white) + Number(online.black)}
          spectatorCount={role === 'spectator' ? 1 : 0}
          canTakeSeat={false}
          onTakeSeat={() => {}}
          onReset={resetGame}
          onLeave={backToLobby}
        />
      </div>

      <GameOverModal
        winner={game.winner}
        reason={game.winReason}
        onPlayAgain={resetGame}
        onBackToLobby={backToLobby}
      />
    </main>
  );
}
