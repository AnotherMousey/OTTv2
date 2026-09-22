const { BOARD_SIZE, STARTING_TIME_MS } = require('./constants');
const { squareToIndex, rotateBoard180, isNeighbor, resolveBattle } = require('./utils');

class GameEngine {
  constructor() {
    this.reset();
  }

  reset() {
    this.board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
    this.currentTurn = 'white';
    this.whiteTimeMs = STARTING_TIME_MS;
    this.blackTimeMs = STARTING_TIME_MS;
    this.turnStartedAt = Date.now();
    this.status = 'active';
    this.winner = null;
    this.history = [];
    this.initializeBoard();
  }

  initializeBoard() {
    const whiteSetup = [
      { square: 'a9', type: 'paper' },
      { square: 'b8', type: 'rock' },
      { square: 'c7', type: 'scissors' },
    ];
    const blackSetup = [
      { square: 'i1', type: 'paper' },
      { square: 'h2', type: 'rock' },
      { square: 'g3', type: 'scissors' },
    ];

    this.placePieces('white', whiteSetup);
    this.placePieces('black', blackSetup);
  }

  placePieces(color, entries) {
    entries.forEach(({ square, type }, index) => {
      const pos = squareToIndex(square);

      if (!pos) {
        throw new Error(`Invalid deployment square: ${square}`);
      }

      this.board[pos.row][pos.col] = {
        id: `${color}-${type}-${index}`,
        color,
        type,
        square,
      };
    });
  }

  snapshotBoard() {
    return this.board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
  }

  countPieces(color) {
    let count = 0;
    for (const row of this.board) {
      for (const cell of row) {
        if (cell && cell.color === color) {
          count += 1;
        }
      }
    }
    return count;
  }

  getPiece(square) {
    const pos = squareToIndex(square);
    if (!pos) {
      return null;
    }

    return this.board[pos.row][pos.col];
  }

  movePiece(fromSquare, toSquare) {
    this.syncTimers();

    if (this.status !== 'active') {
      throw new Error('The game is already finished.');
    }

    const fromPos = squareToIndex(fromSquare);
    const toPos = squareToIndex(toSquare);

    if (!fromPos || !toPos) {
      throw new Error('Square is outside the board.');
    }

    const piece = this.board[fromPos.row][fromPos.col];
    if (!piece) {
      throw new Error(`No piece at ${fromSquare}.`);
    }

    if (piece.color !== this.currentTurn) {
      throw new Error(`It is ${this.currentTurn}'s turn.`);
    }

    if (!isNeighbor(fromSquare, toSquare)) {
      throw new Error('Pieces move exactly one step in any direction.');
    }

    const target = this.board[toPos.row][toPos.col];
    if (target && target.color === piece.color) {
      throw new Error('You cannot move onto your own piece.');
    }

    const moveRecord = {
      from: fromSquare,
      to: toSquare,
      player: piece.color,
      piece: piece.type,
      target: target ? target.type : null,
      timestamp: new Date().toISOString(),
    };

    if (!target) {
      this.board[fromPos.row][fromPos.col] = null;
      this.board[toPos.row][toPos.col] = { ...piece, square: toSquare };
      this.history.push(moveRecord);
      this.checkWinAfterMove(toSquare, piece.color, moveRecord);
      this.afterTurn();
      return this.getPublicState();
    }

    const outcome = resolveBattle(piece.type, target.type);

    if (outcome === 'both') {
      // both pieces of same type are removed from board
      this.board[fromPos.row][fromPos.col] = null;
      this.board[toPos.row][toPos.col] = null;

      moveRecord.result = 'both';
      this.history.push(moveRecord);

      const whiteLeftBoth = this.countPieces('white');
      const blackLeftBoth = this.countPieces('black');

      if (whiteLeftBoth === 0) {
        this.status = 'finished';
        this.winner = 'black';
        return this.getPublicState();
      }

      if (blackLeftBoth === 0) {
        this.status = 'finished';
        this.winner = 'white';
        return this.getPublicState();
      }

      this.afterTurn();
      return this.getPublicState();
    }

    const winnerPiece = outcome === 'attacker' ? piece : target;

    // remove the origin piece
    this.board[fromPos.row][fromPos.col] = null;

    // place the winner on the destination
    this.board[toPos.row][toPos.col] = { ...winnerPiece, square: toSquare };

    moveRecord.result = outcome;
    this.history.push(moveRecord);

    this.checkWinAfterMove(toSquare, winnerPiece.color, moveRecord);

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
  }

  checkWinAfterMove(square, color, moveRecord) {
    if (this.status !== 'active') {
      return;
    }

    if ((color === 'black' && square === 'a1') || (color === 'white' && square === 'i9')) {
      this.status = 'finished';
      this.winner = color;
      moveRecord.result = moveRecord.result || 'goal';
      return;
    }
  }

  afterTurn() {
    if (this.status !== 'active') {
      return;
    }

    this.currentTurn = this.currentTurn === 'white' ? 'black' : 'white';
    this.turnStartedAt = Date.now();
  }

  syncTimers() {
    if (this.status !== 'active') {
      return;
    }

    const now = Date.now();
    const elapsed = now - this.turnStartedAt;

    if (this.currentTurn === 'white') {
      this.whiteTimeMs = Math.max(0, this.whiteTimeMs - elapsed);
    } else {
      this.blackTimeMs = Math.max(0, this.blackTimeMs - elapsed);
    }

    this.turnStartedAt = now;

    if (this.whiteTimeMs <= 0) {
      this.status = 'finished';
      this.winner = 'black';
      return;
    }

    if (this.blackTimeMs <= 0) {
      this.status = 'finished';
      this.winner = 'white';
      return;
    }
  }

  getBoardForPlayer(color) {
    if (!color || color === 'white') {
      return this.snapshotBoard();
    }

    return rotateBoard180(this.snapshotBoard());
  }

  getPublicState(playerColor = null) {
    this.syncTimers();

    return {
      status: this.status,
      winner: this.winner,
      currentTurn: this.currentTurn,
      sideToMove: this.currentTurn,
      playerPerspective: playerColor || 'white',
      whiteTimeMs: this.whiteTimeMs,
      blackTimeMs: this.blackTimeMs,
      board: this.getBoardForPlayer(playerColor),
      history: this.history,
      ruleSet: {
        boardSize: BOARD_SIZE,
        startingClockMs: STARTING_TIME_MS,
        pieces: ['rock', 'paper', 'scissors'],
        orientation: playerColor === 'black' ? 'rotated-180' : 'normal',
      },
    };
  }
}

module.exports = GameEngine;
