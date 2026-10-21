import { test } from "node:test";
import assert from "node:assert/strict";
import { csvRows, validate } from "./accountValidation.js";
test("account input normalizes username, preserves password and defaults team name", () => {
  const { value, errors } = validate(
    {
      username: " Player.One ",
      name: " ",
      password: "  Password2026!  ",
      role: "player",
    },
    new Set(),
  );
  assert.deepEqual(errors, {});
  assert.equal(value.username, "player.one");
  assert.equal(value.name, "player.one");
  assert.equal(value.password, "  Password2026!  ");
  assert.match(
    validate(value, new Set(["player.one"])).errors.username,
    /exists/,
  );
});
test("account validation rejects malformed usernames, roles, names and password lengths", () => {
  for (const username of ["a", "abc def", "-abc", "a".repeat(33)])
    assert.ok(
      validate(
        { username, name: "Team", password: "ValidPass2026!", role: "player" },
        new Set(),
      ).errors.username,
    );
  const result = validate(
    { username: "valid", name: "x", password: "short", role: "admin" },
    new Set(),
  );
  assert.ok(result.errors.name);
  assert.ok(result.errors.password);
  assert.ok(result.errors.role);
});
test("CSV handles header, quoted commas, escaped quotes, CRLF and blank team fields", () => {
  assert.deepEqual(
    csvRows(
      'username,team name,password,role\r\nfirst,"Rock, ""Paper""",Pass2026!long,player\r\nsecond,,  spaces2026!  ,\r\n',
    ),
    [
      ["first", 'Rock, "Paper"', "Pass2026!long", "player"],
      ["second", "", "  spaces2026!  ", ""],
    ],
  );
  assert.throws(() => csvRows('first,"not closed,password'), /not closed/);
});

test("CSV rejects stray quotes and keeps a real account named username", () => {
  assert.throws(() => csvRows('first,te"am,Password2026!'), /Quotes/);
  assert.throws(() => csvRows('first,"team"extra,Password2026!'), /Unexpected/);
  assert.equal(
    csvRows("username,Team Name,ActualPassword2026!,player").length,
    1,
  );
  assert.equal(
    csvRows(
      "\uFEFFusername,name,password,role\nuser01,,Password2026!,player",
    )[0][0],
    "user01",
  );
});
