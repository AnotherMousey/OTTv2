const DEFAULT_BOARD_SIZE = 9;
const PIECE_BEATS = Object.freeze({
  rock: 'scissors',
  scissors: 'paper',
  paper: 'rock',
});

module.exports = {
  DEFAULT_BOARD_SIZE,
  PIECE_BEATS,
};
