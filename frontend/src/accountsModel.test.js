import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emptyTournament,
  normalizeTournament,
  mergeTournamentDirectory,
  tournamentWorkspace,
} from "./accountsModel.js";

test("normalization keeps unknown languages, zero counts and source objects intact", () => {
  const event = {
    id: "one",
    players: [
      { id: "a", language: "python" },
      { id: "b", language: "cpp" },
      { id: "c", language: "rust" },
    ],
    counts: { accepted: 0 },
  };
  const original = structuredClone(event),
    value = normalizeTournament(event);
  assert.deepEqual(
    value.players.map((p) => p.language),
    ["Python", "C++", "rust"],
  );
  assert.equal(value.counts, event.counts);
  assert.deepEqual(value.history, []);
  assert.deepEqual(value.pagination, {});
  assert.deepEqual(event, original);
  assert.notEqual(value.players[0], event.players[0]);
});

test("workspace preserves paginated entry rows and first occurrence identity", () => {
  const page = { id: "a", name: "Entry row", language: "python" },
    extra = { id: "b", name: "Pairing only" },
    me = { id: "c", name: "Off-page current user" };
  const pair = { id: "m1", white: "a" },
    event = {
      players: [page],
      pairs: [pair],
      pairingPlayers: [{ id: "a", name: "Duplicate" }, extra],
      myEntry: me,
      myMatch: { id: "m1", white: "override" },
    };
  const original = structuredClone(event),
    value = tournamentWorkspace(event);
  assert.deepEqual(value.entryRows, [{ ...page, language: "Python" }]);
  assert.deepEqual(
    value.players.map((p) => p.id),
    ["a", "b", "c"],
  );
  assert.equal(value.players[0], value.entryRows[0]);
  assert.equal(value.players[1], extra);
  assert.equal(value.players[2], me);
  assert.equal(value.pairs[0], pair);
  assert.equal(value.pairs.length, 1);
  assert.deepEqual(event, original);
});

test("workspace includes off-page personal match without losing byes or falsy fields", () => {
  const match = { id: "bye", black: null, score: 0 };
  const value = tournamentWorkspace({ myMatch: match });
  assert.deepEqual(value.pairs, [match]);
  assert.deepEqual(value.players, []);
  assert.deepEqual(value.entryRows, []);
  assert.deepEqual(value.counts, { accepted: 0, pending: 0, botsReady: 0 });
});

test("directory refresh replaces rows; additional pages retain first existing IDs", () => {
  const old = { id: "a", name: "Existing" },
    fresh = { id: "a", name: "Updated" },
    other = { id: "b" };
  assert.equal(mergeTournamentDirectory([old], [fresh, other], 30)[0], old);
  assert.deepEqual(
    mergeTournamentDirectory([old], [fresh, other], 30).map((e) => e.id),
    ["a", "b"],
  );
  assert.equal(mergeTournamentDirectory([old], [fresh], 0)[0].name, "Updated");
  assert.equal(mergeTournamentDirectory([], [fresh, fresh], 0).length, 2);
});

test("empty selection keeps the existing defaults and empty page collections", () => {
  assert.equal(emptyTournament.id, "");
  assert.equal(emptyTournament.phase, "registration");
  assert.equal(emptyTournament.round, 1);
  assert.deepEqual(emptyTournament.players, []);
  assert.deepEqual(emptyTournament.pairs, []);
});
