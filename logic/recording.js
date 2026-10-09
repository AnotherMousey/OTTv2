const crypto = require('crypto');
// Capture canonical states at the time each event occurs, not reconstructed history.
function capture(game, event, move = null) {
  const { history, ...state } = game.getPublicState('white');
  return structuredClone({ state, event, move, moveNumber: history.length });
}
function resetRecording(room) {
  room.recording = {
    roomId: room.id,
    matchId: crypto.randomUUID(),
    frames: [capture(room.game, 'Room initialized. White moves first.')],
  };
}
function recordMove(room) {
  const move = room.game.history.at(-1);
  room.recording.frames.push(capture(room.game,
    `${move.player}: ${move.piece} ${move.from} → ${move.to} (${move.result})`, move));
}
function recordTerminal(room, event) {
  room.game.getPublicState('white'); // Synchronize original engine clocks.
  const previous = room.recording.frames.at(-1).state;
  if (room.game.status === 'finished' && previous.status !== 'finished') {
    room.recording.frames.push(capture(room.game,
      event || `Match finished. Winner: ${room.game.winner || 'draw'}.`));
  }
}
module.exports = { resetRecording, recordMove, recordTerminal };
