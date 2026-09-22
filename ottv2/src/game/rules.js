import { BEATS, BOARD_SIZE, PIECE_TYPES, PLAYERS, TARGETS } from "./constants.js";

export function isInsideBoard(row, col) {
  return row >= 1 && row <= BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

export function getPieceAt(pieces, row, col) {
  return Object.values(pieces).find(
    (piece) => piece.alive && piece.row === row && piece.col === col,
  ) ?? null;
}

export function canPieceCapture(attacker, defender) {
  if (!attacker || !defender || attacker.player === defender.player) return false;
  return BEATS[attacker.type] === defender.type;
}

export function resolveBattle(attacker, defender) {
  if (attacker.player === defender.player) return "blocked";
  if (attacker.type === defender.type) return "blocked";
  return canPieceCapture(attacker, defender) ? "attacker" : "defender";
}

export function getValidMoves(pieces, pieceId) {
  const piece = pieces[pieceId];
  if (!piece?.alive) return [];

  const moves = [];

  for (let rowDelta = -1; rowDelta <= 1; rowDelta += 1) {
    for (let colDelta = -1; colDelta <= 1; colDelta += 1) {
      if (rowDelta === 0 && colDelta === 0) continue;

      const row = piece.row + rowDelta;
      const col = piece.col + colDelta;
      if (!isInsideBoard(row, col)) continue;

      const occupant = getPieceAt(pieces, row, col);
      if (!occupant) {
        moves.push({ row, col, kind: "move" });
        continue;
      }

      if (occupant.player === piece.player) continue;
      if (occupant.type === piece.type) continue;

      moves.push({
        row,
        col,
        kind: "attack",
        defenderId: occupant.id,
        outcome: resolveBattle(piece, occupant),
      });
    }
  }

  return moves;
}

export function getRemainingPieces(pieces, player) {
  const counts = {
    [PIECE_TYPES.ROCK]: 0,
    [PIECE_TYPES.PAPER]: 0,
    [PIECE_TYPES.SCISSORS]: 0,
  };

  Object.values(pieces).forEach((piece) => {
    if (piece.alive && piece.player === player) counts[piece.type] += 1;
  });

  return counts;
}

export function checkWinCondition(pieces) {
  const p1Target = TARGETS[PLAYERS.ONE];
  const p2Target = TARGETS[PLAYERS.TWO];

  const p1ReachedGoal = Object.values(pieces).some(
    (piece) =>
      piece.alive &&
      piece.player === PLAYERS.ONE &&
      piece.row === p1Target.row &&
      piece.col === p1Target.col,
  );
  if (p1ReachedGoal) {
    return {
      winner: PLAYERS.ONE,
      reason: `Reached target square ${p1Target.coordinate}.`,
    };
  }

  const p2ReachedGoal = Object.values(pieces).some(
    (piece) =>
      piece.alive &&
      piece.player === PLAYERS.TWO &&
      piece.row === p2Target.row &&
      piece.col === p2Target.col,
  );
  if (p2ReachedGoal) {
    return {
      winner: PLAYERS.TWO,
      reason: `Reached target square ${p2Target.coordinate}.`,
    };
  }

  const p1Remaining = getRemainingPieces(pieces, PLAYERS.ONE);
  const p2Remaining = getRemainingPieces(pieces, PLAYERS.TWO);

  for (const type of Object.values(PIECE_TYPES)) {
    if (p2Remaining[type] === 0) {
      return {
        winner: PLAYERS.ONE,
        reason: `All opponent ${type} pieces have been eliminated.`,
      };
    }
    if (p1Remaining[type] === 0) {
      return {
        winner: PLAYERS.TWO,
        reason: `All opponent ${type} pieces have been eliminated.`,
      };
    }
  }

  return null;
}
