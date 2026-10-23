const { executionError, submissionFeedback } = require('./bot-diagnostics.cjs');

function entrant(e, viewer, event) {
  const u = e.user,
    s = e.activeSubmission;
  const feedback = submissionFeedback(s, !!viewer && (viewer.id === u.id || viewer.role === 'judge' && event?.ownerId === viewer.id));
  return {
    id: u.id,
    name: u.name,
    username: u.username,
    appearance: u.appearance ?? null,
    rating: u.rating,
    games: u.games,
    lastDelta: u.lastDelta,
    joined: e.status === "accepted",
    entry: e.status,
    botReady: s?.status === "ready",
    botName: s?.filename || "",
    language: s?.language || "",
    submissionStatus: s?.status || "missing",
    validationError: feedback.error,
    validationErrorCode: feedback.errorCode,
    validationDetails: feedback.diagnostics,
    botVersion: s?.version || 0,
    latestCodeAt: s?.createdAt || null,
  };
}
function pair(m, diagnostics = false) {
  return {
    id: m.id,
    matchId: m.id,
    round: m.round,
    white: m.whiteId,
    black: m.blackId,
    status: m.status,
    whiteBefore: m.whiteBefore,
    blackBefore: m.blackBefore,
    whiteDelta: m.whiteDelta,
    blackDelta: m.blackDelta,
    score: m.score,
    error: executionError(m.error, diagnostics),
    result: m.result,
  };
}

module.exports = { entrant, pair };
