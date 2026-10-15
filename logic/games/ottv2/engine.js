const {buildConfig} = require('./config');

const {
  parseSquare,
  rotateBoard,
  isAdjacent,
  battleResult,
} = require('./utils');

class GameEngine {
  constructor(config = {}, mode = 'room') {
    this.config = buildConfig(config, mode);
    this.length = this.config.length;
    this.width = this.config.width;
    this.reset();
  }

  reset() {
    this.board = Array.from(
      { length: this.width },
      () => Array(this.length).fill(null)
    );

    this.currentTurn = this.config.firstSide;

    this.whiteTimeMs = this.config.timeTurnLimit;
    this.blackTimeMs = this.config.timeTurnLimit;

    this.turnStartedAt = Date.now();
    this.clockStarted = false;

    this.status = 'active';
    this.winner = null;
    this.history = [];
    this.turnsPlayed = 0;
    this.endReason = null;

    this.initializeBoard();
  }

  initializeBoard() {
    for (const piece of this.config.initialPieces) {
      const pos = parseSquare(piece.square, this.length, this.width);
      this.board[pos.row][pos.col] = {...piece};
    }
  }

  placePieces(color, entries) {
    entries.forEach(({square,type}, index) => {
      const pos = parseSquare(square,this.length,this.width);
      if (!pos) throw Error(`Invalid deployment square: ${square}`);
      this.board[pos.row][pos.col] = {id:`${color}-${type}-${index}`,color,type,square};
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
    const pos = parseSquare(square, this.length, this.width);

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

    const fromPos = parseSquare(fromSquare, this.length, this.width);
    const toPos = parseSquare(toSquare, this.length, this.width);

    if (!fromPos || !toPos) {
      throw new Error('Square is outside the board.');
    }

    fromSquare = fromPos.square; toSquare = toPos.square;
    const piece = this.board[fromPos.row][fromPos.col];

    if (!piece) {
      throw new Error(`No piece at ${fromSquare}.`);
    }

    if (piece.color !== this.currentTurn) {
      throw new Error(`It is ${this.currentTurn}'s turn.`);
    }

    if (!isAdjacent(fromSquare, toSquare, this.length, this.width)) {
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
      this.turnsPlayed += 1;

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
    const outcome = battleResult(
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
      this.turnsPlayed += 1;

      this.checkWinAfterMove(
        toSquare,
        piece.color,
        moveRecord
      );

      if (this.status === 'active') {
        this.checkAllPiecesWin();
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
      this.turnsPlayed += 1;

      this.checkAllPiecesWin();

      if (this.status === 'active') {
        this.afterTurn();
      }

      return this.getPublicState();
    }

    throw new Error('Invalid battle result.');
  }

  checkAllPiecesWin() {
    if (this.status !== 'active') {
      return false;
    }

    if (this.countPieces('white') === 0) {
      this.status = 'finished';
      this.winner = 'black';
      this.endReason = 'all-pieces-eliminated';
      return true;
    }

    if (this.countPieces('black') === 0) {
      this.status = 'finished';
      this.winner = 'white';
      this.endReason = 'all-pieces-eliminated';
      return true;
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
      square === this.config.targets.black
    ) {
      this.status = 'finished';
      this.winner = 'black';

      moveRecord.result = 'goal';
      this.endReason = 'enemy-source-reached';
      return;
    }

    // White target = i9
    if (
      color === 'white' &&
      square === this.config.targets.white
    ) {
      this.status = 'finished';
      this.winner = 'white';

      moveRecord.result = 'goal';
      this.endReason = 'enemy-source-reached';
    }
  }

  afterTurn() {
    if (this.status !== 'active') {
      return;
    }

    if (this.finishAtLimit()) return;
    this.clockStarted = true;

    this.currentTurn =
      this.currentTurn === 'white'
        ? 'black'
        : 'white';

    this.startTurnClock();
  }

  startTurnClock() {
    this.clockStarted = true;
    this.turnStartedAt = Date.now();
    if (this.currentTurn === 'white') this.whiteTimeMs = this.config.timeTurnLimit;
    else this.blackTimeMs = this.config.timeTurnLimit;
  }

  finishAtLimit() {
    if (this.status !== 'active' || this.turnsPlayed < this.config.maxTurns) return false;
    const white=this.countPieces('white'), black=this.countPieces('black');
    this.status='finished';
    if (white !== black) {
      this.winner = white > black ? 'white' : 'black';
      this.endReason = 'move-limit-more-pieces';
      return true;
    }
    const nearest = side => {
      const flag = this.config.flags[side === 'white' ? 'black' : 'white'];
      return this.board.flat().filter(piece => piece && piece.color === side)
        .map(piece => {
          const from = parseSquare(piece.square, this.length, this.width);
          const to = parseSquare(flag, this.length, this.width);
          return Math.abs(from.col - to.col) + Math.abs(from.row - to.row);
        });
    };
    const whiteNearest = Math.min(...nearest('white'));
    const blackNearest = Math.min(...nearest('black'));
    if (whiteNearest !== blackNearest) {
      this.winner = whiteNearest < blackNearest ? 'white' : 'black';
      this.endReason = 'move-limit-nearest-flag';
      return true;
    }
    const totalDistance = side => nearest(side).reduce((sum, distance) => sum + distance, 0);
    const whiteTotal = totalDistance('white');
    const blackTotal = totalDistance('black');
    if (whiteTotal !== blackTotal) {
      this.winner = whiteTotal < blackTotal ? 'white' : 'black';
      this.endReason = 'move-limit-total-distance';
      return true;
    }
    this.winner = Math.random() < 0.5 ? 'white' : 'black';
    this.endReason = 'move-limit-rock-paper-scissors';
    return true;
  }

  forfeit(color, reason = 'forfeit') {
    if (this.status !== 'active') return;
    this.status='finished'; this.winner=color==='white' ? 'black' : 'white'; this.endReason=reason;
  }

  skipTurn() {
    if (this.status !== 'active') return;
    this.turnsPlayed += 1;
    this.afterTurn();
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
      this.whiteTimeMs = Math.max(0, this.config.timeTurnLimit - elapsed);
    } else {
      this.blackTimeMs = Math.max(0, this.config.timeTurnLimit - elapsed);
    }

    // Keep the original turn start: polling must never extend a deadline.

    if (this.whiteTimeMs <= 0) {
      this.status = 'finished';
      this.winner = 'black';
      this.endReason = 'timeout';
      return;
    }

    if (this.blackTimeMs <= 0) {
      this.status = 'finished';
      this.winner = 'white';
      this.endReason = 'timeout';
    }
  }

  serializeBotState(color) {
    const state=this.getPublicState(color);
    return [color,state.currentTurn,this.turnsPlayed,...state.board.flat().filter(Boolean).map(p=>[p.id,p.color,p.type,p.square].join(',')),`@length=${this.length}`,`@width=${this.width}`,`@timeTurnLimit=${this.config.timeTurnLimit}`,`@maxTurns=${this.config.maxTurns}`,`@flag-white=${this.config.flags.white}`,`@flag-black=${this.config.flags.black}`].join('|')+'\n';
  }

  getBoardForPlayer(color) {
    if (!color || color === 'white') {
      return this.snapshotBoard();
    }

    return rotateBoard(
      this.snapshotBoard()
    );
  }

  getPublicState(playerColor = null) {
    this.syncTimers();

    return {
      status: this.status,
      winner: this.winner,
      endReason: this.endReason,
      turnsPlayed: this.turnsPlayed,

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
        length: this.length,
        width: this.width,
        maxTurns: this.config.maxTurns,
        timeTurnLimit: this.config.timeTurnLimit,
        firstSide: this.config.firstSide,
        targets: this.config.targets,
        flags: this.config.flags,

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
