import { useEffect, useMemo, useRef } from "react";
import {
  usePlayContext,
  usePlayerIdentity,
  useUsers,
  withSharedState,
} from "@playhtml/react";
import Board from "../components/Board.jsx";
import GameOverModal from "../components/GameOverModal.jsx";
import GameSidebar from "../components/GameSidebar.jsx";
import PlayerPanel from "../components/PlayerPanel.jsx";
import { createInitialBoard, createInitialGameState } from "../game/initialBoard.js";
import { applyTurn } from "../game/gameLogic.js";
import { PLAYERS } from "../game/constants.js";

function getRoomId() {
  return new URLSearchParams(window.location.search).get("room")?.toUpperCase() || "OTT-DEMO";
}

const roomId = getRoomId();

function makeSeat(identity) {
  return {
    pid: identity.pid,
    name: identity.name || null,
    color: identity.color,
  };
}

const SharedGame = withSharedState(
  {
    id: "ottv2-game-state",
    defaultData: createInitialGameState(roomId),
  },
  function SharedGameView({ data, setData }) {
    const users = useUsers();
    const identity = usePlayerIdentity();
    const { isLoading } = usePlayContext();
    const attemptedSeat = useRef(false);

    const onlinePids = useMemo(() => new Set(users.map((user) => user.pid)), [users]);

    const role = useMemo(() => {
      if (!identity.pid) return "spectator";
      if (data.players.player1?.pid === identity.pid) return PLAYERS.ONE;
      if (data.players.player2?.pid === identity.pid) return PLAYERS.TWO;
      return "spectator";
    }, [data.players.player1?.pid, data.players.player2?.pid, identity.pid]);

    useEffect(() => {
      if (isLoading || !identity.pid || attemptedSeat.current) return;
      attemptedSeat.current = true;

      setData((draft) => {
        if (draft.players.player1?.pid === identity.pid || draft.players.player2?.pid === identity.pid) {
          return;
        }

        if (!draft.players.player1) {
          draft.players.player1 = makeSeat(identity);
        } else if (!draft.players.player2) {
          draft.players.player2 = makeSeat(identity);
        }

        draft.status = draft.players.player1 && draft.players.player2 && !draft.winner
          ? "playing"
          : draft.winner
            ? "finished"
            : "waiting";
      });
    }, [identity.color, identity.name, identity.pid, isLoading, setData]);

    const p1Online = Boolean(data.players.player1?.pid && onlinePids.has(data.players.player1.pid));
    const p2Online = Boolean(data.players.player2?.pid && onlinePids.has(data.players.player2.pid));
    const occupiedOnlineSeats = Number(p1Online) + Number(p2Online);
    const spectatorCount = Math.max(0, users.length - occupiedOnlineSeats);

    const canTakeSeat = role === "spectator" && (
      (data.players.player1 && !p1Online) || (data.players.player2 && !p2Online)
    );

    function takeOfflineSeat() {
      if (!identity.pid) return;
      setData((draft) => {
        const live = new Set(users.map((user) => user.pid));
        if (draft.players.player1 && !live.has(draft.players.player1.pid)) {
          draft.players.player1 = makeSeat(identity);
        } else if (draft.players.player2 && !live.has(draft.players.player2.pid)) {
          draft.players.player2 = makeSeat(identity);
        }
        draft.status = draft.players.player1 && draft.players.player2 && !draft.winner ? "playing" : "waiting";
      });
    }

    function handleMove(pieceId, target) {
      if (role === "spectator" || role !== data.turn) return;

      setData((draft) => {
        const seat = draft.players[role];
        if (!seat || seat.pid !== identity.pid) return;
        if (draft.turn !== role) return;
        applyTurn(draft, pieceId, target);
      });
    }

    function resetGame() {
      setData((draft) => {
        draft.pieces = createInitialBoard();
        draft.turn = PLAYERS.ONE;
        draft.winner = null;
        draft.winReason = null;
        draft.moveNumber = 0;
        draft.history.splice(0, draft.history.length);
        draft.lastMove = null;
        draft.status = draft.players.player1 && draft.players.player2 ? "playing" : "waiting";
      });
    }

    function leaveRoom() {
      setData((draft) => {
        if (draft.players.player1?.pid === identity.pid) draft.players.player1 = null;
        if (draft.players.player2?.pid === identity.pid) draft.players.player2 = null;
        draft.status = "waiting";
      });
      window.setTimeout(() => window.location.assign(window.location.pathname), 120);
    }

    if (isLoading) {
      return <div id="ottv2-game-shell" className="loading-screen">Connecting to room {roomId}…</div>;
    }

    return (
      <main id="ottv2-game-shell" className="game-page">
        <header className="game-header">
          <div>
            <div className="brand-mark brand-mark--small">OTT<span>V2</span></div>
            <p>Multiplayer Rock Paper Scissors Strategy Game</p>
          </div>
          <div className="header-room">Room <strong>{data.roomId}</strong></div>
        </header>

        <div className="game-layout">
          <section className="game-main-column">
            <PlayerPanel
              player={PLAYERS.TWO}
              seat={data.players.player2}
              pieces={data.pieces}
              online={p2Online}
              activeTurn={data.status === "playing" && data.turn === PLAYERS.TWO}
              role={role}
            />

            <Board game={data} role={role} onMove={handleMove} />

            <PlayerPanel
              player={PLAYERS.ONE}
              seat={data.players.player1}
              pieces={data.pieces}
              online={p1Online}
              activeTurn={data.status === "playing" && data.turn === PLAYERS.ONE}
              role={role}
            />
          </section>

          <GameSidebar
            game={data}
            role={role}
            onlineCount={users.length}
            spectatorCount={spectatorCount}
            canTakeSeat={canTakeSeat}
            onTakeSeat={takeOfflineSeat}
            onReset={resetGame}
            onLeave={leaveRoom}
          />
        </div>

        <GameOverModal
          winner={data.winner}
          reason={data.winReason}
          onPlayAgain={resetGame}
          onBackToLobby={leaveRoom}
        />
      </main>
    );
  },
);

export default SharedGame;
