function capture(game, event, move = null) {
  const { history, ...state } = game.getPublicState('white');
  return {
    state: structuredClone(state),
    event,
    move: move ? structuredClone(move) : null,
    moveNumber: history.length,
  };
}

module.exports = { capture };
