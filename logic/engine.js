const outcome = resolveBattle(piece.type, target.type);

// Same type cannot capture each other.
// Nothing changes and the turn stays the same.
if (outcome === 'blocked') {
  throw new Error(
    `${piece.type} cannot capture another ${target.type}.`
  );
}

const winnerPiece =
  outcome === 'attacker'
    ? piece
    : target;

// Attacker leaves its original square.
this.board[fromPos.row][fromPos.col] = null;

// If attacker wins, attacker occupies the destination.
// If defender wins, defender remains on the destination.
this.board[toPos.row][toPos.col] = {
  ...winnerPiece,
  square: toSquare,
};

moveRecord.result = outcome;
this.history.push(moveRecord);

this.checkWinAfterMove(
  toSquare,
  winnerPiece.color,
  moveRecord
);

const whiteLeft = this.countPieces('white');
const blackLeft = this.countPieces('black');

if (whiteLeft === 0) {
  this.status = 'finished';
  this.winner = 'black';
  return this.getPublicState();
}

if (blackLeft === 0) {
  this.status = 'finished';
  this.winner = 'white';
  return this.getPublicState();
}

this.afterTurn();

return this.getPublicState();
