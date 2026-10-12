const { BOARD_SIZE, FILES, RANKS, PIECE_BEATS } = require('./constants');

function squareToIndex(square, size = BOARD_SIZE) {
  const match = /^([a-z])(\d{1,2})$/i.exec(String(square || '').trim());
  if (!match) return null;
  const file = match[1].toLowerCase(), rank = Number(match[2]), col = file.charCodeAt(0)-97;
  if (col < 0 || col >= size || rank < 1 || rank > size) return null;
  return {row:size-rank,col,square:`${file}${rank}`};
}
function indexToSquare(row, col, size = BOARD_SIZE) {
  if (!Number.isInteger(row) || !Number.isInteger(col) || row < 0 || row >= size || col < 0 || col >= size) return null;
  return `${String.fromCharCode(97+col)}${size-row}`;
}
function isNeighbor(fromSquare, toSquare, size = BOARD_SIZE) {
  const from=squareToIndex(fromSquare,size), to=squareToIndex(toSquare,size);
  if (!from || !to) return false;
  const dy=Math.abs(from.row-to.row), dx=Math.abs(from.col-to.col);
  return dx<=1 && dy<=1 && (dx!==0 || dy!==0);
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
