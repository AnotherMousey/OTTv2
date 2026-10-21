// Preserve the runner's newline-delimited protocol and bounded pending buffer.
// An unterminated final line is not a published event.
async function* runnerEvents(body) {
  let pending = "";
  const decoder = new TextDecoder();
  for await (const chunk of body) {
    pending += decoder.decode(chunk, { stream: true });
    if (pending.length > 1024 * 1024)
      throw Error("Runner response exceeded protocol limit.");
    let pos;
    while ((pos = pending.indexOf("\n")) >= 0) {
      const line = pending.slice(0, pos);
      pending = pending.slice(pos + 1);
      if (!line.trim()) continue;
      yield JSON.parse(line);
    }
  }
}
module.exports = { runnerEvents };
