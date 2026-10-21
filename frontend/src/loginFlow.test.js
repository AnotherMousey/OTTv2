import { test } from "node:test";
import assert from "node:assert/strict";
import { loginWithRefresh } from "./loginFlow.js";

test("successful login returns before a pending tournament refresh completes", async () => {
  const calls = [],
    account = { id: "player-a" };
  let complete;
  const pending = new Promise((resolve) => (complete = resolve));
  const result = await loginWithRefresh({
    authenticate: async (username, password) => {
      assert.equal(username, "alice");
      assert.equal(password, "secret");
      return account;
    },
    username: "alice",
    password: "secret",
    onAuthenticated: (value) => {
      assert.equal(value, account);
      calls.push("authenticated");
    },
    refresh: () => {
      calls.push("refresh");
      return pending;
    },
    onRefreshError: assert.fail,
  });
  assert.equal(result, account);
  assert.deepEqual(calls, ["authenticated", "refresh"]);
  complete();
});

test("authentication failure never updates account or refreshes tournaments", async () => {
  const error = Error("Invalid credentials");
  await assert.rejects(
    loginWithRefresh({
      authenticate: async () => {
        throw error;
      },
      onAuthenticated: assert.fail,
      refresh: assert.fail,
      onRefreshError: assert.fail,
    }),
    error,
  );
});

test("refresh failure reports separately after successful authentication", async () => {
  const error = Error("Network unavailable"),
    failures = [];
  const account = await loginWithRefresh({
    authenticate: async () => ({ id: "a" }),
    onAuthenticated: () => {},
    refresh: () => {
      throw error;
    },
    onRefreshError: (value) => failures.push(value),
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(account.id, "a");
  assert.deepEqual(failures, [error]);
});
