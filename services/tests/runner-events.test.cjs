const { test } = require("node:test");
const assert = require("node:assert/strict");
const { runnerEvents } = require("../worker/runner-events.cjs");
async function* bytes(value) {
  const data = Buffer.from(value);
  for (const byte of data) yield Buffer.from([byte]);
}
async function collect(input) {
  const events = [];
  for await (const event of runnerEvents(input)) events.push(event);
  return events;
}

test("runner stream keeps Unicode across byte boundaries and ignores blank lines", async () => {
  const event = { type: "error", error: "Đại học — lỗi" };
  assert.deepEqual(
    await collect(bytes("\r\n" + JSON.stringify(event) + "\n  \n")),
    [event],
  );
});

test("runner parser preserves JSON error rejection and iterator cleanup", async () => {
  let closed = false;
  async function* body() {
    try {
      yield Buffer.from("{bad}\n");
      yield Buffer.from('{"type":"finished"}\n');
    } finally {
      closed = true;
    }
  }
  await assert.rejects(collect(body()), SyntaxError);
  assert.equal(closed, true);
});

test("runner parser does not invent an event from an unterminated tail", async () => {
  assert.deepEqual(
    await collect(bytes('{"type":"frame","seq":0}\n{"type":"finished"}')),
    [{ type: "frame", seq: 0 }],
  );
});
