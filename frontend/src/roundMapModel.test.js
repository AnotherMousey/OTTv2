import { test } from "node:test";
import assert from "node:assert/strict";
import {
  outcome,
  statusLabel,
  columnState,
  visibleMatches,
} from "./roundMapModel.js";

test("published outcomes retain white/black slots, draws, byes and unfinished states", () => {
  const m = { whiteId: "a", blackId: "b", status: "finished", score: 0 };
  assert.equal(outcome(m, "a"), "LOSS");
  assert.equal(outcome(m, "b"), "WIN");
  assert.equal(outcome({ ...m, score: 0.5 }, "a"), "DRAW");
  assert.equal(outcome({ ...m, status: "running" }, "a"), "");
  assert.equal(outcome({ ...m, status: "bye" }, "a"), "BYE");
  assert.equal(outcome({ ...m, status: "bye" }, "b"), "");
});

test("column state distinguishes unpublished, completed, live and failed rounds", () => {
  assert.equal(columnState({ round: 3, total: 0 }, 2), "Unpublished");
  assert.equal(columnState({ round: 1, total: 0 }, 2), "No pairings");
  assert.equal(
    columnState({ round: 1, total: 2, completed: 2, failed: 1 }, 2),
    "Completed",
  );
  assert.equal(
    columnState({ round: 2, total: 2, completed: 1, live: 1, failed: 1 }, 2),
    "In progress",
  );
  assert.equal(
    columnState({ round: 2, total: 2, completed: 0, failed: 1 }, 2),
    "Needs attention",
  );
});

test("off-page focused match is pinned without mutating the original page", () => {
  const matches = [{ id: "a" }],
    focus = { id: "b" },
    column = { matches, focused: focus };
  assert.deepEqual(visibleMatches(column), [
    { id: "b", pinned: true },
    { id: "a" },
  ]);
  assert.deepEqual(focus, { id: "b" });
  assert.equal(column.matches, matches);
  assert.equal(visibleMatches({ matches, focused: { id: "a" } }), matches);
});

test("unknown status stays explicit instead of implying a result", () => {
  assert.equal(statusLabel("unexpected"), "UNKNOWN");
  assert.equal(statusLabel("scheduled"), "ASSIGNED");
  assert.equal(statusLabel("bye"), "BYE");
});
