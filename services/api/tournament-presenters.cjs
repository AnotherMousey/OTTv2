function entrant(e) {
  const u = e.user,
    s = e.activeSubmission;
  return {
    id: u.id,
    name: u.name,
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
    validationError: s?.error || null,
    botVersion: s?.version || 0,
    latestCodeAt: s?.createdAt || null,
  };
}
function pair(m) {
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
    error: m.error,
    result: m.result,
  };
}

module.exports = { entrant, pair };
