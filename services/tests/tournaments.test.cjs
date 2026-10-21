const { test } = require("node:test");
const assert = require("node:assert/strict");
const { database, loadWithDatabase, response } = require("./helpers.cjs");
const db = database();
const transactions = [];
const api = loadWithDatabase(
  "../api/tournaments.cjs",
  db,
  async (callback, options) => {
    transactions.push(options);
    return callback(db);
  },
);
const judge = { id: "judge-1", role: "judge" };
const player = { id: "player-1", role: "player" };
const event = {
  id: "event-1",
  ownerId: judge.id,
  phase: "registration",
  round: 1,
  totalRounds: 2,
  capacity: 20,
};
const entry = {
  userId: player.id,
  status: "accepted",
  user: { ...player, name: "Alice", rating: 1010, games: 2, lastDelta: 10 },
  activeSubmissionId: "bot-1",
  activeSubmission: {
    filename: "a.py",
    language: "python",
    status: "ready",
    version: 2,
    createdAt: "2026-10-20",
  },
};
const request = (extra = {}) => ({
  params: { id: event.id },
  query: {},
  body: {},
  user: judge,
  ...extra,
});

test("tournament facade retains public exports", () => {
  assert.deepEqual(Object.keys(api), [
    "list",
    "state",
    "rankings",
    "create",
    "join",
    "review",
    "settings",
    "advance",
    "entrant",
    "pair",
    "audit",
  ]);
});

test("entrant and pair DTOs preserve aliases, zero values, appearance and input ownership", () => {
  const value = {
    ...entry,
    user: { ...entry.user, rating: 0, appearance: { hat: "fez" } },
    activeSubmission: { ...entry.activeSubmission, version: 0 },
  };
  const before = structuredClone(value);
  assert.deepEqual(api.entrant(value), {
    id: player.id,
    name: "Alice",
    appearance: { hat: "fez" },
    rating: 0,
    games: 2,
    lastDelta: 10,
    joined: true,
    entry: "accepted",
    botReady: true,
    botName: "a.py",
    language: "python",
    submissionStatus: "ready",
    validationError: null,
    botVersion: 0,
    latestCodeAt: "2026-10-20",
  });
  assert.deepEqual(value, before);
  const bye = {
    id: "match-1",
    round: 1,
    whiteId: player.id,
    blackId: null,
    status: "bye",
    score: null,
    whiteDelta: 0,
  };
  assert.deepEqual(api.pair(bye), {
    id: "match-1",
    matchId: "match-1",
    round: 1,
    white: player.id,
    black: null,
    status: "bye",
    whiteBefore: undefined,
    blackBefore: undefined,
    whiteDelta: 0,
    blackDelta: undefined,
    score: null,
    error: undefined,
    result: undefined,
  });
});

test("directory retains pagination, hidden imports and grouped counts", async (t) => {
  t.mock.method(db.tournament, "findMany", async (query) => {
    assert.deepEqual(query.where, {
      AND: [{ phase: { not: "finished" } }, { phase: { not: "importing" } }],
    });
    assert.equal(query.skip, 30);
    assert.equal(query.take, 10);
    return [event];
  });
  t.mock.method(db.tournament, "count", async () => 41);
  t.mock.method(db.entry, "groupBy", async (query) =>
    query.by.length === 2
      ? [
          { tournamentId: event.id, status: "accepted", _count: { _all: 2 } },
          { tournamentId: event.id, status: "pending", _count: { _all: 1 } },
        ]
      : [{ tournamentId: event.id, _count: { _all: 1 } }],
  );
  const res = response();
  await api.list(
    request({ query: { phase: "active", offset: "30", limit: "10" } }),
    res,
  );
  assert.deepEqual(res.body, {
    events: [{ ...event, counts: { accepted: 2, pending: 1, botsReady: 1 } }],
    total: 41,
    offset: 30,
    limit: 10,
  });
});

test("state hides missing/importing tournaments", async (t) => {
  for (const row of [null, { ...event, phase: "importing" }]) {
    t.mock.method(db.tournament, "findUnique", async () => row);
    await assert.rejects(api.state(request(), response()), {
      status: 404,
      message: "Tournament not found.",
    });
  }
});

test("state keeps personal entry, off-page pairing identities, unfinished counts and pagination", async (t) => {
  const other = { id: "player-2", name: "Bob", rating: 1030 };
  const me = {
    ...entry,
    userId: "player-3",
    user: { ...entry.user, id: "player-3", name: "Carol" },
  };
  const match = {
    id: "match-1",
    round: 1,
    whiteId: other.id,
    blackId: me.userId,
    status: "queued",
  };
  t.mock.method(db.tournament, "findUnique", async () => event);
  t.mock.method(db.entry, "findMany", async (query) => {
    assert.equal(query.skip, 100);
    return [entry];
  });
  t.mock.method(db.entry, "findUnique", async () => me);
  t.mock.method(db.entry, "count", async ({ where }) =>
    where.activeSubmission
      ? 1
      : where.status === "pending"
        ? 0
        : where.status === "accepted"
          ? 2
          : 3,
  );
  t.mock.method(db.match, "findMany", async ({ where }) =>
    where.status === "finished" ? [] : [match],
  );
  t.mock.method(db.match, "findFirst", async () => match);
  t.mock.method(db.match, "count", async ({ where }) =>
    where.status ? 1 : 20,
  );
  t.mock.method(db.user, "findMany", async () => [other, me.user]);
  t.mock.method(db.syncReceipt, "findUnique", async () => null);
  const res = response();
  await api.state(
    request({ user: me.user, query: { offset: "100", matchOffset: "10" } }),
    res,
  );
  assert.deepEqual(res.body.pagination, {
    offset: 100,
    limit: 100,
    total: 3,
    matchOffset: 10,
    matchTotal: 20,
  });
  assert.deepEqual(res.body.counts, {
    accepted: 2,
    pending: 0,
    botsReady: 1,
    unfinished: 1,
  });
  assert.deepEqual(res.body.myEntry, api.entrant(me));
  assert.deepEqual(res.body.myMatch, api.pair(match));
  assert.deepEqual(res.body.pairingPlayers, [
    other,
    { id: me.userId, name: "Carol", rating: 1010 },
  ]);
});

test("archived rankings retain historical names/ratings, mapped IDs and current appearance", async (t) => {
  const participants = [
    { id: "old-a", name: "Zed", rating: 1200 },
    { id: "old-b", name: "Amy", rating: 1200 },
  ];
  t.mock.method(db.syncReceipt, "findUnique", async () => ({
    payload: {
      complete: true,
      manifest: { participants },
      accountMap: { "old-a": "a", "old-b": "b" },
    },
  }));
  t.mock.method(db.user, "findMany", async () => [
    { id: "a", appearance: { hat: "fez" } },
  ]);
  const res = response();
  await api.rankings(request(), res);
  assert.deepEqual(
    res.body.rankings.map(
      ({ id, name, rating, rank, appearance, submissionStatus }) => ({
        id,
        name,
        rating,
        rank,
        appearance,
        submissionStatus,
      }),
    ),
    [
      {
        id: "b",
        name: "Amy",
        rating: 1200,
        rank: 1,
        appearance: null,
        submissionStatus: "archived",
      },
      {
        id: "a",
        name: "Zed",
        rating: 1200,
        rank: 2,
        appearance: { hat: "fez" },
        submissionStatus: "archived",
      },
    ],
  );
  assert.deepEqual(participants[0].name, "Zed");
});

test("incomplete imports are not visible through rankings", async (t) => {
  t.mock.method(db.syncReceipt, "findUnique", async () => ({
    payload: { complete: false },
  }));
  await assert.rejects(api.rankings(request(), response()), { status: 404 });
});

test("join rejects non-player before transaction; accepted requests stay idempotent", async (t) => {
  const count = transactions.length;
  await assert.rejects(api.join(request(), response()), {
    status: 403,
    message: "Join using a player account.",
  });
  assert.equal(transactions.length, count);
  const locks = [];
  t.mock.method(db, "$queryRaw", async (sql, id) => {
    locks.push([sql.join("?"), id]);
    return [];
  });
  t.mock.method(db.tournament, "findUnique", async () => event);
  t.mock.method(db.entry, "findUnique", async () => entry);
  const res = response();
  await api.join(request({ user: player }), res);
  assert.deepEqual(res.body, { ok: true });
  assert.match(locks[0][0], /Tournament.*FOR UPDATE/);
});

test("review preserves organizing-judge ownership and explicit booleans", async (t) => {
  t.mock.method(db.tournament, "findUnique", async () => event);
  await assert.rejects(
    api.review(
      request({
        user: { id: "another-judge", role: "judge" },
        body: { all: true, accept: true },
      }),
      response(),
    ),
    { status: 403 },
  );
  await assert.rejects(
    api.review(request({ body: { all: true, accept: "false" } }), response()),
    { status: 400 },
  );
  t.mock.method(db.entry, "updateMany", async (query) => {
    assert.deepEqual(query, {
      where: { tournamentId: event.id, status: "pending" },
      data: { status: "declined" },
    });
  });
  t.mock.method(db.audit, "create", async (query) => {
    assert.equal(query.data.action, "entry.review");
  });
  const res = response();
  await api.review(request({ body: { all: true, accept: false } }), res);
  assert.deepEqual(res.body, { ok: true });
});

test("advance pairing queues only scheduled matches before setting live phase", async (t) => {
  const calls = [];
  t.mock.method(db.tournament, "findUnique", async () => ({
    ...event,
    phase: "pairing",
  }));
  t.mock.method(db.match, "findMany", async (query) => {
    assert.deepEqual(query.where, {
      tournamentId: event.id,
      round: 1,
      status: "scheduled",
    });
    return [{ id: "match-1" }];
  });
  t.mock.method(db.job, "createMany", async (query) => {
    calls.push("jobs");
    assert.deepEqual(query, {
      data: [{ key: "match:match-1", type: "match", matchId: "match-1" }],
      skipDuplicates: true,
    });
  });
  t.mock.method(db.match, "updateMany", async () => {
    calls.push("matches");
  });
  t.mock.method(db.tournament, "update", async (query) => {
    calls.push("phase");
    assert.deepEqual(query.data, { phase: "live" });
  });
  t.mock.method(db.audit, "create", async (query) => {
    calls.push("audit");
    assert.deepEqual(query.data.metadata, { from: "pairing", round: 1 });
  });
  await api.advance(request(), response());
  assert.deepEqual(calls, ["jobs", "matches", "phase", "audit"]);
});

test("advance never finishes a live round with unfinished work", async (t) => {
  t.mock.method(db.tournament, "findUnique", async () => ({
    ...event,
    phase: "live",
  }));
  t.mock.method(db.match, "count", async () => 1);
  await assert.rejects(api.advance(request(), response()), {
    status: 409,
    message:
      "Wait for all matches; retry failed infrastructure jobs before advancing.",
  });
});
