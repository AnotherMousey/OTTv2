export const BOARD_SIZE = 9;
export const FILES = ["a", "b", "c", "d", "e", "f", "g", "h", "i"];

export const PLAYERS = {
  ONE: "player1",
  TWO: "player2",
};

export const PIECE_TYPES = {
  ROCK: "rock",
  PAPER: "paper",
  SCISSORS: "scissors",
};

export const PIECE_LABELS = {
  [PIECE_TYPES.ROCK]: "Rock",
  [PIECE_TYPES.PAPER]: "Paper",
  [PIECE_TYPES.SCISSORS]: "Scissors",
};

export const PIECE_ICONS = {
  [PIECE_TYPES.ROCK]: "✊",
  [PIECE_TYPES.PAPER]: "✋",
  [PIECE_TYPES.SCISSORS]: "✌️",
};

export const BEATS = {
  [PIECE_TYPES.ROCK]: PIECE_TYPES.SCISSORS,
  [PIECE_TYPES.SCISSORS]: PIECE_TYPES.PAPER,
  [PIECE_TYPES.PAPER]: PIECE_TYPES.ROCK,
};

export const TARGETS = {
  [PLAYERS.ONE]: { row: 9, col: 8, coordinate: "i9" },
  [PLAYERS.TWO]: { row: 1, col: 0, coordinate: "a1" },
};

export const MAX_HISTORY = 100;

export const INITIAL_LAYOUT = {
  [PLAYERS.ONE]: [
    [PIECE_TYPES.ROCK, "b1"],
    [PIECE_TYPES.PAPER, "c1"],
    [PIECE_TYPES.SCISSORS, "d1"],
    [PIECE_TYPES.ROCK, "f1"],
    [PIECE_TYPES.PAPER, "g1"],
    [PIECE_TYPES.SCISSORS, "h1"],
    [PIECE_TYPES.ROCK, "c2"],
    [PIECE_TYPES.PAPER, "e2"],
    [PIECE_TYPES.SCISSORS, "g2"],
  ],
  [PLAYERS.TWO]: [
    [PIECE_TYPES.ROCK, "h9"],
    [PIECE_TYPES.PAPER, "g9"],
    [PIECE_TYPES.SCISSORS, "f9"],
    [PIECE_TYPES.ROCK, "d9"],
    [PIECE_TYPES.PAPER, "c9"],
    [PIECE_TYPES.SCISSORS, "b9"],
    [PIECE_TYPES.ROCK, "g8"],
    [PIECE_TYPES.PAPER, "e8"],
    [PIECE_TYPES.SCISSORS, "c8"],
  ],
};
