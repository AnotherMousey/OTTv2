const { BOARD_SIZE, STARTING_TIME_MS } = require('./constants');

const {
  squareToIndex,
  rotateBoard180,
  isNeighbor,
  resolveBattle,
} = require('./utils');

class GameEngine {
  constructor() {
    this.reset();
  }

  reset() {
    this.board = Array.from(
      { length: BOARD_SIZE },
      () => Array(BOARD_SIZE).fill(null)
    );

    this.currentTurn = 'white';

    this.whiteTimeMs = STARTING_TIME_MS;
    this.blackTimeMs = STARTING_TIME_MS;

    this.turnStartedAt = Date.now();
    this.clockStarted = false;

    this.status = 'active';
    this.winner = null;
    this.history = [];

    this.initializeBoard();
  }

  initializeBoard() {
    const whiteSetup = [
      { square: 'b1', type: 'rock' },
      { square: 'c1', type: 'paper' },
      { square: 'd1', type: 'scissors' },

      { square: 'b2', type: 'paper' },
      { square: 'c2', type: 'scissors' },
      { square: 'd2', type: 'rock' },

      { square: 'b3', type: 'scissors' },
      { square: 'c3', type: 'rock' },
      { square: 'd3', type: 'paper' },
    ];

    const blackSetup = [
      { square: 'f7', type: 'paper' },
      { square: 'g7', type: 'rock' },
      { square: 'h7', type: 'scissors' },

      { square: 'f8', type: 'rock' },
      { square: 'g8', type: 'scissors' },
      { square: 'h8', type: 'paper' },

      { square: 'f9', type: 'scissors' },
      { square: 'g9', type: 'paper' },
      { square: 'h9', type: 'rock' },
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
    return this.board.map((row) =>
      row.map((cell) => (cell ? { ...cell } : null))
    );
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

  countPiecesByType(color, type) {
    let count = 0;

    for (const row of this.board) {
      for (const cell of row) {
        if (
          cell &&
          cell.color === color &&
          cell.type === type
        ) {
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
      throw new Error(
        'Pieces move exactly one step in any direction.'
      );
    }

    const target = this.board[toPos.row][toPos.col];

    // Cannot move onto your own piece.
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

    // Normal move to empty square.
    if (!target) {
      this.board[fromPos.row][fromPos.col] = null;

      this.board[toPos.row][toPos.col] = {
        ...piece,
        square: toSquare,
      };

      moveRecord.result = 'move';
      this.history.push(moveRecord);

      this.checkWinAfterMove(
        toSquare,
        piece.color,
        moveRecord
      );

      if (this.status === 'active') {
        this.afterTurn();
      }

      return this.getPublicState();
    }

    // Battle against enemy piece.
    const outcome = resolveBattle(
      piece.type,
      target.type
    );

    // Same type blocks the move.
    // Nobody moves.
    // Nobody dies.
    // Turn does not change.
    if (outcome === 'blocked') {
      throw new Error(
        `${piece.type} cannot capture another ${target.type}.`
      );
    }

    // Attacker wins.
    if (outcome === 'attacker') {
      this.board[fromPos.row][fromPos.col] = null;

      this.board[toPos.row][toPos.col] = {
        ...piece,
        square: toSquare,
      };

      moveRecord.result = 'attacker';
      this.history.push(moveRecord);

      this.checkWinAfterMove(
        toSquare,
        piece.color,
        moveRecord
      );

      if (this.status === 'active') {
        this.checkEliminationWin();
      }

      if (this.status === 'active') {
        this.afterTurn();
      }

      return this.getPublicState();
    }

    // Defender wins.
    // Attacker disappears.
    // Defender stays in the same square.
    if (outcome === 'defender') {
      this.board[fromPos.row][fromPos.col] = null;

      moveRecord.result = 'defender';
      this.history.push(moveRecord);

      this.checkEliminationWin();

      if (this.status === 'active') {
        this.afterTurn();
      }

      return this.getPublicState();
    }

    throw new Error('Invalid battle result.');
  }

  checkEliminationWin() {
    if (this.status !== 'active') {
      return false;
    }

    const types = [
      'rock',
      'paper',
      'scissors',
    ];

    // If White loses all pieces of one type,
    // Black wins.
    for (const type of types) {
      if (
        this.countPiecesByType('white', type) === 0
      ) {
        this.status = 'finished';
        this.winner = 'black';
        return true;
      }
    }

    // If Black loses all pieces of one type,
    // White wins.
    for (const type of types) {
      if (
        this.countPiecesByType('black', type) === 0
      ) {
        this.status = 'finished';
        this.winner = 'white';
        return true;
      }
    }

    return false;
  }

  checkWinAfterMove(square, color, moveRecord) {
    if (this.status !== 'active') {
      return;
    }

    // Black target = a1
    if (
      color === 'black' &&
      square === 'a1'
    ) {
      this.status = 'finished';
      this.winner = 'black';

      moveRecord.result = 'goal';
      return;
    }

    // White target = i9
    if (
      color === 'white' &&
      square === 'i9'
    ) {
      this.status = 'finished';
      this.winner = 'white';

      moveRecord.result = 'goal';
    }
  }

  afterTurn() {
    if (this.status !== 'active') {
      return;
    }

    this.clockStarted = true;

    this.currentTurn =
      this.currentTurn === 'white'
        ? 'black'
        : 'white';

    this.turnStartedAt = Date.now();
  }

  syncTimers() {
    if (
      this.status !== 'active' ||
      !this.clockStarted
    ) {
      return;
    }

    const now = Date.now();
    const elapsed = now - this.turnStartedAt;

    if (this.currentTurn === 'white') {
      this.whiteTimeMs = Math.max(
        0,
        this.whiteTimeMs - elapsed
      );
    } else {
      this.blackTimeMs = Math.max(
        0,
        this.blackTimeMs - elapsed
      );
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
    }
  }

  getBoardForPlayer(color) {
    if (!color || color === 'white') {
      return this.snapshotBoard();
    }

    return rotateBoard180(
      this.snapshotBoard()
    );
  }

  getPublicState(playerColor = null) {
    this.syncTimers();

    return {
      status: this.status,
      winner: this.winner,

      currentTurn: this.currentTurn,
      sideToMove: this.currentTurn,

      playerPerspective:
        playerColor || 'white',

      whiteTimeMs: this.whiteTimeMs,
      blackTimeMs: this.blackTimeMs,

      board:
        this.getBoardForPlayer(playerColor),

      history: this.history,

      remaining: {
        white: {
          rock:
            this.countPiecesByType(
              'white',
              'rock'
            ),
          paper:
            this.countPiecesByType(
              'white',
              'paper'
            ),
          scissors:
            this.countPiecesByType(
              'white',
              'scissors'
            ),
        },

        black: {
          rock:
            this.countPiecesByType(
              'black',
              'rock'
            ),
          paper:
            this.countPiecesByType(
              'black',
              'paper'
            ),
          scissors:
            this.countPiecesByType(
              'black',
              'scissors'
            ),
        },
      },

      ruleSet: {
        boardSize: BOARD_SIZE,
        startingClockMs: STARTING_TIME_MS,

        pieces: [
          'rock',
          'paper',
          'scissors',
        ],

        orientation:
          playerColor === 'black'
            ? 'rotated-180'
            : 'normal',
      },
    };
  }
}

module.exports = GameEngine;
