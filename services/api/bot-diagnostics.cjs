// Stored diagnostics may contain bot source, paths or secrets. Never serialize
// arbitrary text, even to a bot owner. Extract only known diagnostic categories
// and locations in the submitted file; keep the original in protected storage.
function diagnosticDetails(error) {
  const text = String(error || '').slice(0, 65536);
  const details = new Set();
  for (const match of text.matchAll(/\b(player\.cpp|RobotPlayer\.java):(\d{1,6})(?::(\d{1,6}))?:\s*(?:fatal )?error:/g))
    details.add(`${match[1]}, line ${match[2]}${match[3] ? `, column ${match[3]}` : ''}: compilation error.`);
  for (const match of text.matchAll(/File ["'][^"'\r\n]*[\\/]player\.py["'], line (\d{1,6})/g))
    details.add(`player.py, line ${match[1]}.`);
  for (const match of text.matchAll(/\b(SyntaxError|IndentationError|TabError|NameError|TypeError|ValueError|AttributeError|ImportError|ModuleNotFoundError|ZeroDivisionError|IndexError|KeyError|RecursionError|MemoryError|NullPointerException|ArrayIndexOutOfBoundsException|ClassCastException|ArithmeticException)\b/g))
    details.add(`${match[1]}: check the submitted code.`);
  return [...details].slice(0, 12).join('\n') || null;
}

function submissionFeedback(submission, allowed = false) {
  if (!submission?.error) return { error: null, errorCode: null, diagnostics: null };
  const raw = String(submission.error);
  const infrastructure = submission.status !== 'invalid' || /RUNNER_INFRA|ENOENT|Could not start|runner (?:connection|refused|closed)|lease lost|infrastructure/i.test(raw);
  if (infrastructure) return { error: "We couldn't validate this bot due to a server problem. Please try again later.", errorCode: 'BOT_VALIDATION_UNAVAILABLE', diagnostics: null };
  if (!allowed) return { error: 'Bot validation failed.', errorCode: 'BOT_INVALID', diagnostics: null };
  const [errorCode, error] = /compilation failed|\.(?:cpp|java):\d+(?::\d+)?:\s*(?:fatal )?error:|SyntaxError|IndentationError|TabError/i.test(raw)
    ? ['BOT_COMPILE_FAILED', 'This bot could not be compiled. Check the code and try again.']
    : /thinking limit|timed out|BOT_MOVE_TIMEOUT/i.test(raw)
      ? ['BOT_TIME_LIMIT', 'This bot exceeded the thinking time limit. Check the code and try again.']
      : /invalid move|illegal move|unreadable output/i.test(raw)
        ? ['BOT_INVALID_MOVE', 'This bot did not return a valid move. Check the move format and game rules.']
        : /process (?:stopped|exited)|Traceback|Exception|Error:/i.test(raw)
          ? ['BOT_RUNTIME_FAILED', 'This bot stopped unexpectedly during execution. Check the code and try again.']
          : ['BOT_INVALID', 'This bot could not be validated. Check the submission requirements and try again.'];
  return { error, errorCode, diagnostics: diagnosticDetails(raw) };
}

function submissionView(submission, allowed = false) {
  return { ...submission, ...submissionFeedback(submission, allowed) };
}

function executionError(error, allowed = false) {
  if (!error) return error;
  const details = allowed === true ? diagnosticDetails(error) : null;
  return details ? `Bot execution failed.\n${details}` : 'Match could not be completed. Please try again later.';
}

function executionFrame(frame, allowed = false) {
  if (!frame || typeof frame.event !== 'string') return frame;
  const diagnostic = /^(white|black)-(forfeit|timeout):/.exec(frame.event);
  if (!diagnostic) return frame;
  const details = allowed === true ? diagnosticDetails(frame.event) : null;
  const message = diagnostic[2] === 'timeout' ? 'turn skipped.' : `Bot execution failed.${details ? '\n' + details : ''}`;
  return { ...frame, event: `${diagnostic[1]}-${diagnostic[2]}: ${message}` };
}

module.exports = { executionError, executionFrame, diagnosticDetails, submissionFeedback, submissionView };
