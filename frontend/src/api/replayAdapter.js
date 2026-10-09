import { parseReplay } from '../replay.js';
export function squareToPosition(square) {
  if (!/^[a-i][1-9]$/i.test(square || '')) throw new Error('Invalid piece square.');
  return { x: square.toLowerCase().charCodeAt(0) - 97, y: 9 - Number(square[1]) };
}
export function positionToSquare(x, y) {
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || x > 8 || y < 0 || y > 8) throw new Error('Invalid board coordinate.');
  return `${'abcdefghi'[x]}${9-y}`;
}
export function stateToPieces(state) {
  if (!Array.isArray(state?.board) || state.board.length !== 9 || state.board.some(row => !Array.isArray(row) || row.length !== 9)) throw new Error('Expected a 9×9 backend board.');
  // The backend may rotate array order for Black, but piece.square stays canonical.
  return state.board.flat().filter(Boolean).map(piece => ({
    id: piece.id, side: piece.color, type: piece.type,
    ...squareToPosition(piece.square),
  })).sort((a,b) => a.id.localeCompare(b.id));
}
export function recordingToReplay(recording) {
  if (!recording?.roomId || !recording.matchId || !Array.isArray(recording.frames) || !recording.frames.length) throw new Error('Room recording is incomplete.');
  const frames = recording.frames.map(({ state, event, move, moveNumber }) => ({
    pieces: stateToPieces(state), event, side: move?.player || state.currentTurn,
    ...(move ? { from: move.from, to: move.to } : {}),
    moveNumber, status: state.status, winner: state.winner,
    currentTurn: state.currentTurn,
    clocks: { white: state.whiteTimeMs, black: state.blackTimeMs },
  }));
  return parseReplay(JSON.stringify({
    schemaVersion: 1, gameId: 'ottv2', rulesVersion: 'legacy-timed', boardSize: 9,
    mapName: `Room ${recording.roomId}`, maxMoves: Math.max(1, frames.length-1),
    firstSide: 'white', teams: { white: 'White player', black: 'Black player' },
    roomId: recording.roomId, matchId: recording.matchId,
    mode: 'room-recording', timeLimitMs: 300000, frames,
  }));
}
