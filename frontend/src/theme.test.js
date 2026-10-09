import test from "node:test";
import assert from "node:assert/strict";
import { initialTheme, persistTheme } from "./theme.js";
test("theme uses saved preference before OS preference", () => {
  assert.equal(initialTheme({ getItem: () => "light" }, true), "light");
  assert.equal(initialTheme({ getItem: () => "dark" }, false), "dark");
  assert.equal(initialTheme({ getItem: () => "invalid" }, true), "dark");
  assert.equal(initialTheme(null, false), "light");
});
test("blocked storage keeps theme toggle usable", () => {
  const blocked = {
    getItem() {
      throw Error("blocked");
    },
    setItem() {
      throw Error("blocked");
    },
  };
  assert.equal(initialTheme(blocked, true), "dark");
  assert.doesNotThrow(() => persistTheme(blocked, "light"));
  let saved;
  persistTheme({ setItem: (key, value) => (saved = [key, value]) }, "dark");
  assert.deepEqual(saved, ["ott-theme", "dark"]);
});
