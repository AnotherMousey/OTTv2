const { BOARD_SIZE, FILES, RANKS, PIECE_BEATS } = require('./constants');

function squareToIndex(square) {
  const match = /^([a-i])([1-9])$/i.exec(String(square || '').trim());
  if (!match) {
    return null;
  }

  const file = match[1].toLowerCase();
  const rank = Number(match[2]);
  const fileIndex = FILES.indexOf(file);
  const rankIndex = RANKS.indexOf(rank);

  if (fileIndex === -1 || rankIndex === -1) {
    return null;
  }

  return { row: rankIndex, col: fileIndex, square: `${file}${rank}` };
}

function indexToSquare(row, col) {
  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
    return null;
  }

  return `${FILES[col]}${RANKS[row]}`;
}

function isNeighbor(fromSquare, toSquare) {
  const from = squareToIndex(fromSquare);
  const to = squareToIndex(toSquare);

  if (!from || !to) {
    return false;
  }

  const rowDelta = Math.abs(from.row - to.row);
  const colDelta = Math.abs(from.col - to.col);
  return rowDelta <= 1 && colDelta <= 1 && (rowDelta !== 0 || colDelta !== 0);
}

function resolveBattle(attackerType, defenderType) {
  // Same type cannot capture each other.
  if (attackerType === defenderType) {
    return 'blocked';
  }

  // Rock > Scissors
  // Scissors > Paper
  // Paper > Rock
  if (PIECE_BEATS[attackerType] === defenderType) {
    return 'attacker';
  }

  return 'defender';
}

function rotateBoard180(board) {
  return board.slice().reverse().map((row) => row.slice().reverse());
}

module.exports = {
  squareToIndex,
  indexToSquare,
  isNeighbor,
  resolveBattle,
  rotateBoard180,
};
