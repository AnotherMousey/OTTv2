const { DEFAULT_BOARD_SIZE, PIECE_BEATS } = require('./constants');

function parseSquare(square, length = DEFAULT_BOARD_SIZE, width = length) {
  const match = /^([a-z])(\d{1,2})$/i.exec(String(square || '').trim());
  if (!match) return null;
  const file = match[1].toLowerCase(), rank = Number(match[2]), col = file.charCodeAt(0)-97;
  if (col < 0 || col >= length || rank < 1 || rank > width) return null;
  return {row:width-rank,col,square:`${file}${rank}`};
}
function formatSquare(row, col, length = DEFAULT_BOARD_SIZE, width = length) {
  if (!Number.isInteger(row) || !Number.isInteger(col) || row < 0 || row >= width || col < 0 || col >= length) return null;
  return `${String.fromCharCode(97+col)}${width-row}`;
}
function isAdjacent(fromSquare, toSquare, length = DEFAULT_BOARD_SIZE, width = length) {
  const from=parseSquare(fromSquare,length,width), to=parseSquare(toSquare,length,width);
  if (!from || !to) return false;
  const dy=Math.abs(from.row-to.row), dx=Math.abs(from.col-to.col);
  return dx<=1 && dy<=1 && (dx!==0 || dy!==0);
}

function battleResult(attackerType, defenderType) {
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

function rotateBoard(board) {
  return board.slice().reverse().map((row) => row.slice().reverse());
}

module.exports = {
  parseSquare,
  formatSquare,
  isAdjacent,
  battleResult,
  rotateBoard,
};
