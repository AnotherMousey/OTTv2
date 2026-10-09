// The portal consumes state snapshots from a judge. It never executes submitted bots.
export const TYPES = ["rock", "paper", "scissors"];
export const beats = { rock: "scissors", paper: "rock", scissors: "paper" };
export const initialPieces = () =>
  ["white", "black"].flatMap((side, s) =>
    Array.from({ length: 9 }, (_, i) => ({
      id: `${side}-${i}`,
      side,
      type: TYPES[i % 3],
      x: s ? 6 + (i % 3) : i % 3,
      y: s ? Math.floor(i / 3) : 6 + Math.floor(i / 3),
    })),
  );
export function createDemoReplay() {
  let pieces = initialPieces();
  const frames = [
    {
      pieces: structuredClone(pieces),
      event: "Judge initialized Meadow 09. White moves first.",
      side: "white",
    },
  ];
  let seed = 37;
  for (let turn = 0; turn < 72; turn++) {
    const side = turn % 2 ? "black" : "white";
    const options = [];
    for (const p of pieces.filter((p) => p.side === side))
      for (let dx = -1; dx <= 1; dx++)
        for (let dy = -1; dy <= 1; dy++) {
          const x = p.x + dx,
            y = p.y + dy;
          if ((!dx && !dy) || x < 0 || x > 8 || y < 0 || y > 8) continue;
          const target = pieces.find((q) => q.x === x && q.y === y);
          if (target && (target.side === side || target.type === p.type))
            continue;
          options.push({
            p,
            x,
            y,
            target,
            weight: (side === "white" ? dx - dy : dy - dx) + (target ? 4 : 0),
          });
        }
    if (!options.length) break;
    options.sort((a, b) => b.weight - a.weight);
    seed = (seed * 16807) % 2147483647;
    const { p, x, y, target } = options[seed % Math.min(7, options.length)];
    const from = `${"abcdefghi"[p.x]}${9 - p.y}`,
      to = `${"abcdefghi"[x]}${9 - y}`;
    let event = `${side}: ${p.type} ${from} → ${to}`;
    if (target) {
      const wins = beats[p.type] === target.type;
      pieces = pieces.filter((q) => q.id !== (wins ? target.id : p.id));
      if (wins)
        pieces = pieces.map((q) => (q.id === p.id ? { ...q, x, y } : q));
      event += wins
        ? ` · captured ${target.type}`
        : ` · defeated by ${target.type}`;
    } else pieces = pieces.map((q) => (q.id === p.id ? { ...q, x, y } : q));
    const goal = pieces.some((q) =>
      q.side === "white" ? q.x === 8 && q.y === 0 : q.x === 0 && q.y === 8,
    );
    const eliminated = ["white", "black"].some((s) =>
      TYPES.some((t) => !pieces.some((q) => q.side === s && q.type === t)),
    );
    frames.push({ pieces: structuredClone(pieces), event, side, from, to });
    if (goal || eliminated) {
      frames.at(-1).event += " · judge ended match";
      break;
    }
  }
  return {
    schemaVersion: 1,
    gameId: "ottv2",
    rulesVersion: "2.1",
    mapName: "Meadow 09",
    boardSize: 9,
    maxMoves: 100,
    firstSide: "white",
    teams: { white: "Atlas Team", black: "Byte Knights" },
    bots: {white: {language: "Python", version: "Atlas v12"}, black: {language: "Java", version: "Knight v8"}},
    frames,
  };
}
export function parseReplay(text) {
  const r = JSON.parse(text);
  if (r.schemaVersion !== 1 || r.gameId !== "ottv2" || r.boardSize !== 9)
    throw Error("Expected an OTTv2 schema v1 replay with a 9×9 board.");
  if (
    !Number.isInteger(r.maxMoves) ||
    r.maxMoves < 1 ||
    !Array.isArray(r.frames) ||
    !r.frames.length ||
    r.frames.length > r.maxMoves + 1 ||
    r.frames.length > 10001
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
      f.pieces.length > 81 ||
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
        p.x > 8 ||
        p.y < 0 ||
        p.y > 8 ||
        cells.has(`${p.x},${p.y}`)
      )
        throw Error("Invalid or overlapping piece in replay.");
      ids.add(p.id);
      cells.add(`${p.x},${p.y}`);
    }
  }
  return r;
}
export const demoReplay = createDemoReplay();
