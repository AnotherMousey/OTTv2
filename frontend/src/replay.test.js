import test from "node:test";
import assert from "node:assert/strict";
import { demoReplay, parseReplay, beats } from "./replay.js";
test("demo replay has legal single-square RPS moves and no overlap", () => {
  assert.deepEqual(parseReplay(JSON.stringify(demoReplay)), demoReplay);
  for (let i = 1; i < demoReplay.frames.length; i++) {
    const before = demoReplay.frames[i - 1].pieces,
      after = demoReplay.frames[i].pieces;
    const changed = before.filter(
      (p) => !after.some((q) => q.id === p.id && q.x === p.x && q.y === p.y),
    );
    assert.ok(changed.length >= 1 && changed.length <= 2);
    for (const p of after) {
      const old = before.find((q) => q.id === p.id);
      assert.ok(Math.abs(p.x - old.x) <= 1 && Math.abs(p.y - old.y) <= 1);
    }
    if (changed.length === 2) {
      const survivor = after.find((p) => changed.some((q) => q.id === p.id));
      const loser = changed.find((p) => p.id !== survivor.id);
      assert.equal(beats[survivor.type], loser.type);
    }
  }
});
test("import rejects malformed and overlapping snapshots", () => {
  assert.throws(() => parseReplay("{}"));
  const r = structuredClone(demoReplay);
  r.frames[0].pieces[1].x = r.frames[0].pieces[0].x;
  assert.throws(() => parseReplay(JSON.stringify(r)), /overlapping/);
});
