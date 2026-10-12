const BOARD_SIZE = 9;
const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'];
const RANKS = [9, 8, 7, 6, 5, 4, 3, 2, 1];
const STARTING_TIME_MS = 5 * 60 * 1000;
const PIECE_BEATS = {
  rock: 'scissors',
  scissors: 'paper',
  paper: 'rock',
};

module.exports = {
  BOARD_SIZE,
  FILES,
  RANKS,
  STARTING_TIME_MS,
  PIECE_BEATS,
};
