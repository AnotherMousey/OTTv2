const { test } = require("node:test");
const { once } = require("node:events");
const assert = require("node:assert/strict");
const { database, loadWithDatabase } = require("./helpers.cjs");
const db = database();
const { createApp } = loadWithDatabase("../api/index.cjs", db);
const { digest } = require("../shared/domain.cjs");
const users = {
  player: {
    id: "player-1",
    name: "Alice",
    username: "alice",
    role: "player",
    active: true,
  },
  judge: {
    id: "judge-1",
    name: "Judge One",
    username: "judge",
    role: "judge",
    active: true,
  },
  other: {
    id: "judge-2",
    name: "Judge Two",
    username: "judge2",
    role: "judge",
    active: true,
  },
};
async function client(t) {
  t.mock.method(db.session, "findUnique", async ({ where }) => {
    const name = Object.keys(users).find(
      (key) => digest(key) === where.tokenHash,
    );
    return name
      ? {
          user: users[name],
          userId: users[name].id,
          expiresAt: new Date(Date.now() + 60000),
        }
      : null;
  });
  const server = createApp().listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  });
  return async (path, { as, body, method = body ? "POST" : "GET" } = {}) => {
    const res = await fetch(
      `http://127.0.0.1:${server.address().port}${path}`,
      {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(as ? { Authorization: "Bearer " + as } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      },
    );
    return { status: res.status, body: await res.json() };
  };
}

test("actual tournament route retains public pagination validation and JSON errors", async (t) => {
  const request = await client(t);
  assert.deepEqual(await request("/api/tournaments?offset=-1"), {
    status: 400,
    body: { error: "Offset must be 0-100000." },
  });
  t.mock.method(db.tournament, "findMany", async () => []);
  t.mock.method(db.tournament, "count", async () => 0);
  assert.deepEqual(await request("/api/tournaments?limit=10"), {
    status: 200,
    body: { events: [], total: 0, offset: 0, limit: 10 },
  });
});

test("route middleware preserves missing-session and player versus judge permissions", async (t) => {
  const request = await client(t);
  assert.deepEqual(
    await request("/api/tournaments", { body: { name: "Arena" } }),
    { status: 401, body: { error: "Log in to continue." } },
  );
  assert.deepEqual(
    await request("/api/tournaments", {
      as: "player",
      body: { name: "Arena", startDate: "2099-01-01", endDate: "2099-01-07" },
    }),
    { status: 403, body: { error: "Judge access required." } },
  );
  t.mock.method(db.tournament, "create", async ({ data }) => {
    assert.equal(data.ownerId, users.judge.id);
    assert.equal(data.name, "Arena");
    assert.equal(data.maxTurns, 324);
    return { id: data.id, name: data.name };
  });
  t.mock.method(db.audit, "create", async () => {});
  const res = await request("/api/tournaments", {
    as: "judge",
    body: { name: "Arena", startDate: "2099-01-01", endDate: "2099-01-07" },
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.name, "Arena");
  assert.match(res.body.id, /^[a-f0-9-]{36}$/);
});

test("actual review endpoint requires organizing judge and preserves request validation", async (t) => {
  const request = await client(t);
  t.mock.method(db.tournament, "findUnique", async () => ({
    id: "event-1",
    ownerId: users.judge.id,
    phase: "registration",
  }));
  assert.deepEqual(
    await request("/api/tournaments/event-1/review", {
      as: "other",
      body: { all: true, accept: true },
    }),
    {
      status: 403,
      body: { error: "Only the organizing judge can change this tournament." },
    },
  );
  assert.deepEqual(
    await request("/api/tournaments/event-1/review", {
      as: "judge",
      body: { all: true, accept: "yes" },
    }),
    { status: 400, body: { error: "accept must be true or false." } },
  );
});

test("optional session is still validated on public tournament state reads", async (t) => {
  const request = await client(t);
  assert.deepEqual(
    await request("/api/tournaments/event-1", { as: "expired" }),
    { status: 401, body: { error: "Your session expired. Log in again." } },
  );
});
