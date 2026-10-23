const { test } = require("node:test");
const assert = require("node:assert/strict");
const { database, loadWithDatabase } = require("./helpers.cjs");
const db = database();
const queue = require.resolve("../worker/queue.cjs");
const calls = [];
const methods = Object.fromEntries(
  ["appendBatch", "heartbeat", "finish", "failure", "defer"].map((name) => [
    name,
    async (...args) => {
      calls.push([name, ...args]);
      return true;
    },
  ]),
);
require.cache[queue] = {
  id: queue,
  filename: queue,
  loaded: true,
  exports: methods,
};
const { execute } = loadWithDatabase("../worker/index.cjs", db);
const config = require("../../logic/games/registry.js")
  .resolveGame()
  .configure({}, "bot");
const job = {
  id: "job-1",
  type: "match",
  matchId: "MATCH-1",
  attempts: 1,
  availableAt: new Date(),
  claim: "claim-1",
};
const white = { id: "bot-1", source: "white" },
  black = { id: "bot-2", source: "black" };

function setup(t, fetch) {
  calls.length = 0;
  t.mock.method(console, "log", () => {});
  t.mock.method(console, "error", () => {});
  const oldUrl = process.env.RUNNER_URL,
    oldSecret = process.env.RUNNER_SECRET;
  process.env.RUNNER_URL = "http://fixture-runner/";
  process.env.RUNNER_SECRET = "fixture-secret";
  t.after(() => {
    for (const [key, value] of [
      ["RUNNER_URL", oldUrl],
      ["RUNNER_SECRET", oldSecret],
    ])
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
  });
  t.mock.method(db.match, "findUnique", async () => ({
    id: job.matchId,
    whiteSubmissionId: white.id,
    blackSubmissionId: black.id,
    whiteId: "a",
    blackId: "b",
    tournamentId: "event-1",
    config,
  }));
  t.mock.method(db.submission, "findUnique", async ({ where }) =>
    where.id === white.id ? white : black,
  );
  t.mock.method(db.user, "findMany", async () => [
    { id: "a", name: "Alice" },
    { id: "b", name: "Bób" },
  ]);
  t.mock.method(global, "fetch", fetch);
}
function stream(events) {
  const encoded = new TextEncoder().encode(
    events.map((e) => JSON.stringify(e)).join("\n") + "\n",
  );
  return {
    ok: true,
    status: 200,
    body: (async function* () {
      for (let i = 0; i < encoded.length; i += 3) yield encoded.slice(i, i + 3);
    })(),
  };
}

test("worker keeps frozen input and publishes all frames before terminal result", async (t) => {
  setup(t, async (url, options) => {
    assert.equal(url, "http://fixture-runner/run");
    assert.equal(options.headers.Authorization, "Bearer fixture-secret");
    assert.deepEqual(JSON.parse(options.body), {
      type: "match",
      id: job.matchId,
      config,
      white,
      black,
      teams: { white: "Alice", black: "Bób" },
    });
    return stream([
      {
        type: "frame",
        seq: 0,
        frame: { turn: 0 },
        metadata: { name: "initial" },
      },
      { type: "frame", seq: 1, frame: { turn: 1 } },
      {
        type: "finished",
        result: { winner: "white" },
        metadata: { name: "final" },
      },
    ]);
  });
  await execute(job);
  assert.deepEqual(
    calls.map((c) => c[0]),
    ["appendBatch", "appendBatch", "finish"],
  );
  assert.equal(calls[0][2][0].seq, 0);
  assert.equal(calls[1][2][0].seq, 1);
  assert.deepEqual(calls[0][2][0].metadata, {
    name: "initial",
    teams: { white: "Alice", black: "Bób" },
  });
  assert.deepEqual(calls[2][2].metadata, {
    name: "final",
    teams: { white: "Alice", black: "Bób" },
  });
});

test("runner saturation cancels response and defers without recording failure", async (t) => {
  setup(t, async () => ({
    status: 429,
    body: { cancel: async () => calls.push(["cancel"]) },
  }));
  await execute(job);
  assert.deepEqual(
    calls.map((c) => c[0]),
    ["cancel", "defer"],
  );
});

test("non-OK runner response keeps infrastructure error wording", async (t) => {
  setup(t, async () => ({ ok: false, status: 503 }));
  await execute(job);
  assert.deepEqual(calls, [
    ["failure", job, "Execution runner refused the job (503)."],
  ]);
});

test("network errors retain nested transport diagnosis", async (t) => {
  setup(t, async () => {
    throw Object.assign(Error("fetch failed"), {
      cause: { errors: [{ code: "ECONNREFUSED" }] },
    });
  });
  await execute(job);
  assert.deepEqual(calls, [
    [
      "failure",
      job,
      "Execution runner connection failed (ECONNREFUSED). Check runner health.",
    ],
  ]);
});

test("unterminated stream never finalizes a match", async (t) => {
  setup(t, async () => ({
    ok: true,
    body: (async function* () {
      yield Buffer.from('{"type":"finished"}');
    })(),
  }));
  await execute(job);
  assert.deepEqual(calls, [
    ["failure", job, "Runner closed before returning a final result."],
  ]);
});

test("oversized incoming buffer is rejected before publishing events", async (t) => {
  setup(t, async () => ({
    ok: true,
    body: (async function* () {
      yield Buffer.alloc(1024 * 1024 + 1, 32);
    })(),
  }));
  await execute(job);
  assert.deepEqual(calls, [
    ["failure", job, "Runner response exceeded protocol limit."],
  ]);
});

test("lease loss during buffered publication prevents finalization", async (t) => {
  setup(t, async () =>
    stream([
      { type: "frame", seq: 0, frame: {} },
      { type: "finished", result: {} },
    ]),
  );
  t.mock.method(methods, "appendBatch", async () => false);
  await execute(job);
  assert.deepEqual(calls, [["failure", job, "Job ownership changed."]]);
});

test("validation marks BOT_INVALID terminal; match bot errors stay retryable", async (t) => {
  setup(t, async () =>
    stream([{ type: "error", code: "BOT_INVALID", error: "Compile failed." }]),
  );
  const validation = {
    ...job,
    type: "validate",
    submissionId: white.id,
    config,
  };
  await execute(validation);
  assert.deepEqual(calls, [["failure", validation, "Compile failed.", true]]);
  calls.length = 0;
  await execute(job);
  assert.deepEqual(calls, [["failure", job, "Compile failed.", false]]);
});

test("missing frozen submission fails before contacting runner", async (t) => {
  setup(t, async () => assert.fail("Runner must not execute a missing bot"));
  t.mock.method(db.submission, "findUnique", async () => null);
  await execute(job);
  assert.deepEqual(calls, [
    ["failure", job, "Frozen match submission is missing."],
  ]);
});

test('worker keeps diagnostics in protected records, not shared console logs', async t => {
  const raw = 'Traceback /app/logic/grader/python_runner.py\nSECRET_SOURCE TOKEN=SECRET';
  setup(t, async () => stream([{ type: 'error', code: 'BOT_INVALID', error: raw }]));
  const logs = [];
  t.mock.method(console, 'error', value => logs.push(value));
  const validation = { ...job, type: 'validate', submissionId: white.id, config };
  await execute(validation);
  assert.deepEqual(calls, [['failure', validation, raw, true]]);
  assert.ok(!logs.join('').includes('SECRET'));
  assert.equal(JSON.parse(logs[0]).diagnosticRecord, white.id);
});
