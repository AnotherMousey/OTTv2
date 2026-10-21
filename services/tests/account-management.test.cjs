const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const fixture = require("./account-fixture.cjs");
const { verifyPassword, digest } = require("../shared/domain.cjs");
beforeEach(fixture.reset);
async function client(t) {
  const server = fixture.createApp().listen(0, "127.0.0.1");
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
const row = (username, extra = {}) => ({
  username,
  password: "PlayerSecret2026!",
  ...extra,
});
test("judge endpoints reject missing and player sessions; settings need a session", async (t) => {
  const request = await client(t);
  for (const path of [
    "/api/accounts",
    "/api/accounts/review",
    "/api/accounts/bulk",
    "/api/auth/registration",
  ]) {
    assert.equal((await request(path, { body: {} })).status, 401);
    assert.equal((await request(path, { as: "player", body: {} })).status, 403);
  }
  for (const path of ["/api/auth/profile", "/api/auth/password"])
    assert.equal((await request(path, { body: {} })).status, 401);
});
test("single create normalizes usernames, defaults name, supports roles and never returns passwords", async (t) => {
  const request = await client(t);
  const created = await request("/api/accounts", {
    as: "judge",
    body: row(" NEW.Player "),
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.account.username, "new.player");
  assert.equal(created.body.account.name, "new.player");
  assert.equal(created.body.account.role, "player");
  assert.equal("passwordHash" in created.body.account, false);
  assert.equal("password" in created.body.account, false);
  assert.equal(
    (await request("/api/accounts", { as: "judge", body: row("NEW.PLAYER") }))
      .status,
    409,
  );
  assert.equal(
    (
      await request("/api/accounts", {
        as: "judge",
        body: row("newjudge", { role: "judge" }),
      })
    ).status,
    201,
  );
  for (const body of [
    row("x"),
    row("bad user"),
    row("newone", { password: "short" }),
    row("newone", { role: "admin" }),
  ])
    assert.equal(
      (await request("/api/accounts", { as: "judge", body })).status,
      400,
    );
});
test("registration defaults closed, persists toggle, forces player role and validates confirmation", async (t) => {
  const request = await client(t);
  assert.deepEqual(await request("/api/auth/registration"), {
    status: 200,
    body: { enabled: false },
  });
  assert.equal(
    (await request("/api/auth/register", { body: row("signup") })).status,
    403,
  );
  assert.equal(
    (
      await request("/api/auth/registration", {
        as: "judge",
        body: { enabled: "yes" },
      })
    ).status,
    400,
  );
  await request("/api/auth/registration", {
    as: "judge",
    body: { enabled: true },
  });
  assert.equal((await request("/api/auth/registration")).body.enabled, true);
  assert.equal(
    (
      await request("/api/auth/register", {
        body: row("signup", { confirmPassword: "wrong" }),
      })
    ).status,
    400,
  );
  const created = await request("/api/auth/register", {
    body: row("signup", {
      role: "judge",
      confirmPassword: "PlayerSecret2026!",
    }),
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.account.role, "player");
  await request("/api/auth/registration", {
    as: "judge",
    body: { enabled: false },
  });
  assert.equal(
    (
      await request("/api/auth/register", {
        body: row("later", { confirmPassword: "PlayerSecret2026!" }),
      })
    ).status,
    403,
  );
});
test("registration rechecks closure inside transaction after password hashing", async (t) => {
  const request = await client(t);
  await request("/api/auth/registration", {
    as: "judge",
    body: { enabled: true },
  });
  const original = fixture.db.registrationSettings.findUnique;
  let reads = 0;
  t.mock.method(fixture.db.registrationSettings, "findUnique", async (args) => {
    const value = await original(args);
    return ++reads === 1 ? value : { ...value, enabled: false };
  });
  const result = await request("/api/auth/register", {
    body: row("closed-race", { confirmPassword: "PlayerSecret2026!" }),
  });
  assert.equal(result.status, 403);
  assert.equal(
    fixture.users().some((user) => user.username === "closed-race"),
    false,
  );
});
test("profile edits only current name and preserves identity, role, password and rating", async (t) => {
  const request = await client(t);
  const before = fixture.users().find((user) => user.username === "player");
  assert.equal(
    (await request("/api/auth/profile", { as: "player", body: { name: "x" } }))
      .status,
    400,
  );
  const result = await request("/api/auth/profile", {
    as: "player",
    body: {
      name: "  Team Orbit  ",
      id: "account-1",
      role: "judge",
      rating: 9999,
    },
  });
  assert.equal(result.body.account.name, "Team Orbit");
  const after = fixture.users().find((user) => user.id === before.id);
  assert.deepEqual(after, { ...before, name: "Team Orbit" });
  assert.equal(
    (await request("/api/auth/me", { as: "player" })).body.account.name,
    "Team Orbit",
  );
});
test("password validation, old/new login and revocation of other sessions", async (t) => {
  const request = await client(t),
    user = fixture.users().find((user) => user.username === "player");
  await fixture.db.session.create({
    data: {
      tokenHash: digest("other-device"),
      userId: user.id,
      expiresAt: new Date(Date.now() + 60000),
    },
  });
  const body = {
    currentPassword: "OriginalPass2026!",
    newPassword: "Replacement2026!",
    confirmPassword: "Replacement2026!",
  };
  for (const override of [
    { currentPassword: "wrong" },
    { newPassword: "short", confirmPassword: "short" },
    { confirmPassword: "different" },
    {
      newPassword: body.currentPassword,
      confirmPassword: body.currentPassword,
    },
  ])
    assert.equal(
      (
        await request("/api/auth/password", {
          as: "player",
          body: { ...body, ...override },
        })
      ).status,
      400,
    );
  assert.equal(
    (await request("/api/auth/password", { as: "player", body })).status,
    200,
  );
  assert.equal(
    await verifyPassword(
      body.newPassword,
      fixture.users().find((row) => row.id === user.id).passwordHash,
    ),
    true,
  );
  assert.equal((await request("/api/auth/me", { as: "player" })).status, 200);
  assert.equal(
    (await request("/api/auth/me", { as: "other-device" })).status,
    401,
  );
  assert.equal(
    (
      await request("/api/auth/login", {
        body: { username: "player", password: body.currentPassword },
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await request("/api/auth/login", {
        body: { username: "player", password: body.newPassword },
      })
    ).status,
    200,
  );
});
test("concurrent password change cannot overwrite a newer password", async (t) => {
  const request = await client(t);
  t.mock.method(fixture.db.user, "updateMany", async () => ({ count: 0 }));
  assert.equal(
    (
      await request("/api/auth/password", {
        as: "player",
        body: {
          currentPassword: "OriginalPass2026!",
          newPassword: "Replacement2026!",
          confirmPassword: "Replacement2026!",
        },
      })
    ).status,
    409,
  );
  assert.equal((await request("/api/auth/me", { as: "player" })).status, 200);
});
test("bulk review reports invalid and duplicate rows without echoing passwords", async (t) => {
  const request = await client(t),
    accounts = [
      row("PLAYER"),
      row("newteam"),
      row("NEWTEAM"),
      row("invalid", { password: "short" }),
    ];
  const review = await request("/api/accounts/review", {
    as: "judge",
    body: { accounts },
  });
  assert.equal(review.status, 200);
  assert.match(review.body.rows[0].error, /exists/);
  assert.equal(review.body.rows[1].error, "");
  assert.match(review.body.rows[2].error, /Duplicate/);
  assert.match(review.body.rows[3].error, /Password/);
  assert.equal(
    JSON.stringify(review.body).includes("PlayerSecret2026!"),
    false,
  );
  assert.equal(
    (await request("/api/accounts/bulk", { as: "judge", body: { accounts } }))
      .status,
    400,
  );
  assert.equal(fixture.users().length, 2);
  assert.equal(
    (
      await request("/api/accounts/bulk", {
        as: "judge",
        body: { accounts: [] },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await request("/api/accounts/review", {
        as: "judge",
        body: { accounts: Array(501).fill(row("many")) },
      })
    ).status,
    400,
  );
});
test("bulk creation writes all accounts atomically and handles uniqueness races", async (t) => {
  const request = await client(t);
  const result = await request("/api/accounts/bulk", {
    as: "judge",
    body: {
      accounts: [
        row("bulk-a"),
        row("bulk-b", { name: "Rock, Paper", role: "judge" }),
      ],
    },
  });
  assert.equal(result.status, 201);
  assert.equal(result.body.accounts.length, 2);
  assert.equal(
    result.body.accounts.find((row) => row.username === "bulk-b").name,
    "Rock, Paper",
  );
  assert.equal(JSON.stringify(result.body).includes("password"), false);
  const original = fixture.db.user.createMany;
  t.mock.method(fixture.db.user, "createMany", async (args) => {
    await original({ data: [args.data[0]] });
    throw Object.assign(Error("race"), { code: "P2002" });
  });
  assert.equal(
    (
      await request("/api/accounts/bulk", {
        as: "judge",
        body: { accounts: [row("race-a"), row("race-b")] },
      })
    ).status,
    409,
  );
  assert.equal(
    fixture.users().some((row) => row.username === "race-a"),
    false,
  );
});
test("rate limits prevent public registration and password mutation", async (t) => {
  const request = await client(t);
  t.mock.method(fixture.db.rateBucket, "upsert", async () => ({ count: 11 }));
  assert.equal(
    (await request("/api/auth/register", { body: row("limited") })).status,
    429,
  );
  assert.equal(
    (
      await request("/api/auth/password", {
        as: "player",
        body: {
          currentPassword: "OriginalPass2026!",
          newPassword: "Replacement2026!",
          confirmPassword: "Replacement2026!",
        },
      })
    ).status,
    429,
  );
  assert.equal(
    await verifyPassword(
      "OriginalPass2026!",
      fixture.users().find((row) => row.username === "player").passwordHash,
    ),
    true,
  );
});
