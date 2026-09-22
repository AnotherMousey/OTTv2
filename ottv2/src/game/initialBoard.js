import { INITIAL_LAYOUT, PLAYERS } from "./constants.js";
import { coordinateToPosition } from "../utils/coordinates.js";

export function createInitialBoard() {
  const pieces = {};

  for (const player of [PLAYERS.ONE, PLAYERS.TWO]) {
    INITIAL_LAYOUT[player].forEach(([type, coordinate], index) => {
      const { row, col } = coordinateToPosition(coordinate);
      const id = `${player}-${type}-${index + 1}`;
      pieces[id] = {
        id,
        player,
        type,
        row,
        col,
        alive: true,
      };
    });
  }

  return pieces;
}

export function createInitialGameState(roomId) {
  return {
    roomId,
    status: "waiting",
    players: {
      player1: null,
      player2: null,
    },
    turn: PLAYERS.ONE,
    pieces: createInitialBoard(),
    winner: null,
    winReason: null,
    moveNumber: 0,
    history: [],
    lastMove: null,
  };
}
