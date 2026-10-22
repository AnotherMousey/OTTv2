// Stored runner/compiler diagnostics are private. Redact at the response boundary
// so previously persisted errors and replay frames are protected too.
function executionError(error, allowed = false) {
  return error && allowed !== true ? 'Bot execution failed.' : error;
}

function executionFrame(frame, allowed = false) {
  if (!frame || allowed === true || typeof frame.event !== 'string') return frame;
  const diagnostic = /^(white|black)-(forfeit|timeout):/.exec(frame.event);
  if (!diagnostic) return frame;
  const message = diagnostic[2] === 'timeout' ? 'turn skipped.' : 'Bot execution failed.';
  return { ...frame, event: `${diagnostic[1]}-${diagnostic[2]}: ${message}` };
}

module.exports = { executionError, executionFrame };
