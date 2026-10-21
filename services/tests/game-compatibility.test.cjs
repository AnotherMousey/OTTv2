const { test } = require("node:test");
const assert = require("node:assert/strict");
const { resolveGame } = require("../../logic/games/registry.js");
const {
  resolveFrozen,
  executionDeadline,
} = require("../platform/game-integration.cjs");

// Frozen identity from main at 9af945f. An intentional rules/library upgrade
// needs its own compatibility plan rather than silently rewriting this fixture.
const identity = {
  id: "ottv2",
  libraryVersion: "2",
  rulesVersion: "ottv2-rules-v1",
  protocolVersion: 2,
  rendererVersion: "1",
  libraryDigest:
    "23ad305c6ade537622c80848bf6d0ea8349614364a285a3542121fb180b05891",
};

test("existing frozen game identity remains executable after platform refactoring", () => {
  const game = resolveGame();
  assert.deepEqual(game.identity, identity);
  const frozen = { ...game.configure({}, "bot"), _game: identity };
  assert.equal(resolveFrozen(frozen).plugin, game);
  assert.equal(executionDeadline(frozen), 475000);
});

test("identity validation still rejects mismatched libraries", () => {
  const frozen = {
    ...resolveGame().configure({}, "bot"),
    _game: { ...identity, libraryDigest: "0".repeat(64) },
  };
  assert.throws(
    () => resolveFrozen(frozen),
    /Installed game identity differs from frozen match/,
  );
});

test("legacy engine entry point still exposes the authoritative constructor", () => {
  assert.equal(
    require("../../logic/engine.js"),
    require("../../logic/games/ottv2/engine.js"),
  );
});
