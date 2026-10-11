// Display-side adapter: the web client can render these canonical snapshots
// without re-running the grader or trusting a player's output.
function displayFrames(replay) {
  if (!replay || !Array.isArray(replay.frames) || replay.frames.length === 0) {
    throw new Error('Replay log has no frames.');
  }
  return replay.frames.map((frame, index) => {
    if (!frame || !frame.state || typeof frame.moveNumber !== 'number') {
      throw new Error(`Replay frame ${index} is invalid.`);
    }
    return {
      index,
      event: frame.event,
      move: frame.move,
      moveNumber: frame.moveNumber,
      state: structuredClone(frame.state),
    };
  });
}

module.exports = { displayFrames };
