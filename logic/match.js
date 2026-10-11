const crypto = require('crypto');
const GameEngine = require('./engine');
const { getSubmission } = require('./submissions');
const { runMatch } = require('./grader');

const matches = new Map();

function createMatch({ whiteSubmissionId, blackSubmissionId }) {
  const white = getSubmission(whiteSubmissionId);
  const black = getSubmission(blackSubmissionId);
  if (white.id === black.id) throw new Error('A match requires two different submissions.');

  const match = {
    id: `MATCH-${crypto.randomBytes(6).toString('hex').toUpperCase()}`,
    whiteSubmissionId: white.id,
    blackSubmissionId: black.id,
    status: 'queued',
    error: null,
    createdAt: new Date().toISOString(),
    replay: null,
  };
  matches.set(match.id, match);
  void executeMatch(match, white, black);
  return publicMatch(match);
}

async function executeMatch(match, white, black) {
  match.status = 'running';
  try {
    match.replay = await runMatch({
      matchId: match.id,
      whiteSource: white.source,
      blackSource: black.source,
      whiteLanguage: white.language,
      blackLanguage: black.language,
      game: new GameEngine(),
    });
    match.status = 'finished';
  } catch (error) {
    match.status = 'failed';
    match.error = error.message || 'Match execution failed.';
  }
}

function getMatch(id) {
  const match = matches.get(String(id || '').trim().toUpperCase());
  if (!match) throw new Error('Match not found.');
  return match;
}

function publicMatch(match) {
  return {
    id: match.id,
    whiteSubmissionId: match.whiteSubmissionId,
    blackSubmissionId: match.blackSubmissionId,
    status: match.status,
    error: match.error,
    createdAt: match.createdAt,
    replay: match.replay ? { matchId: match.replay.matchId, frameCount: match.replay.frames.length } : null,
  };
}

module.exports = { matches, createMatch, getMatch, publicMatch };
