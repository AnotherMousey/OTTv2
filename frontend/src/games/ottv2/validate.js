export const TYPES = ["rock", "paper", "scissors"];
export function validateReplay(r) {
  const width = r.board?.width ?? r.boardSize;
  const height = r.board?.height ?? r.boardSize;
  if (r.schemaVersion !== 1 || r.gameId !== "ottv2" || !Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 64 || height > 64)
    throw Error("Expected an OTTv2 schema v1 replay with a valid grid.");
  if (
    (r.maxMoves !== null && (!Number.isInteger(r.maxMoves) || r.maxMoves < 1)) ||
    !Array.isArray(r.frames) ||
    !r.frames.length ||
    (r.maxMoves !== null && r.frames.length > r.maxMoves + 2) ||
    r.frames.length > 10002
  )
    throw Error("Invalid move limit or frame count.");
  if (
    !r.teams?.white ||
    !r.teams?.black ||
    typeof r.mapName !== "string" ||
    typeof r.rulesVersion !== "string" ||
    !["white", "black"].includes(r.firstSide)
  )
    throw Error("Replay metadata is incomplete.");
  for (const f of r.frames) {
    if (
      !Array.isArray(f.pieces) ||
      f.pieces.length > width * height ||
      typeof f.event !== "string"
    )
      throw Error("Each frame needs pieces and an event.");
    const cells = new Set(),
      ids = new Set();
    for (const p of f.pieces) {
      if (
        typeof p.id !== "string" ||
        ids.has(p.id) ||
        !["white", "black"].includes(p.side) ||
        !TYPES.includes(p.type) ||
        !Number.isInteger(p.x) ||
        !Number.isInteger(p.y) ||
        p.x < 0 ||
        p.x >= width ||
        p.y < 0 ||
        p.y >= height ||
        cells.has(`${p.x},${p.y}`)
      )
        throw Error("Invalid or overlapping piece in replay.");
      ids.add(p.id);
      cells.add(`${p.x},${p.y}`);
    }
  }
  if (r.board?.goals && (!Array.isArray(r.board.goals) || r.board.goals.some(g=>!Number.isInteger(g.x)||!Number.isInteger(g.y)||g.x<0||g.y<0||g.x>=width||g.y>=height))) throw Error('Invalid goal tiles.');
  if (r.result && (!['active','finished'].includes(r.result.status) || ![null,'white','black'].includes(r.result.winner))) throw Error('Invalid replay result.');
  return r;
}
