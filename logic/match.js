const crypto = require('crypto');
const {resolveGame,resolveConfig} = require('./games/registry');
const { getSubmission } = require('./submissions');
const { runMatch } = require('./grader');

const storage=require('./storage');
const {requireRuntime}=require('./runtime');
const matches = new Map(storage.load('matches').map(m=>{
  if(['queued','running'].includes(m.status)){m.status='failed';m.error='Server restarted before the match finished. Submit a new match.';storage.save('matches',m);}
  return [m.id,m];
}));
function saveMatch(match){const {game,...record}=match;storage.save('matches',record);}
const queue = [];
let running = 0;
const workers = Math.max(1,Math.min(8,Math.trunc(Number(process.env.MATCH_WORKERS))||2));
function drain() {
  while (running < workers && queue.length) {
    const [match,white,black] = queue.shift(); running++;
    executeMatch(match,white,black).finally(()=>{running--;drain();});
  }
}

function createMatch({ whiteSubmissionId, blackSubmissionId, gameId='ottv2', mapId, config, clientId = '' }) {
  const white = getSubmission(whiteSubmissionId);
  const black = getSubmission(blackSubmissionId);
  if (white.id === black.id) throw new Error('A match requires two different submissions.');

  requireRuntime(white.language);requireRuntime(black.language);
  const owner=typeof clientId==='string'?clientId.slice(0,128):'';
  if(owner && (white.clientId!==owner || black.clientId!==owner))throw Error('Submissions do not belong to this client.');
  const resolved = resolveConfig(mapId,config,'bot');
  const game = resolveGame(gameId).create(resolved,'bot');
  const match = {
    id: `MATCH-${crypto.randomBytes(6).toString('hex').toUpperCase()}`,
    whiteSubmissionId: white.id,
    blackSubmissionId: black.id,
    status: 'queued',
    error: null,
    createdAt: new Date().toISOString(),
    replay: null,
    gameId, config: resolved, game, clientId: owner,
    language: `${white.language.toUpperCase()} / ${black.language.toUpperCase()}`, mapName: resolved.mapName || `${resolved.boardSize}×${resolved.boardSize}`,
  };
  saveMatch(match);
  matches.set(match.id, match);
  queue.push([match,white,black]);
  drain();
  return publicMatch(match);
}

async function executeMatch(match, white, black) {
  match.status = 'running';
  try {
    saveMatch(match);
    match.replay = await runMatch({
      matchId: match.id,
      whiteSource: white.source,
      blackSource: black.source,
      whiteLanguage: white.language,
      blackLanguage: black.language,
      game: match.game,
    });
    match.status = 'finished';
    saveMatch(match);
  } catch (error) {
    match.status = 'failed';
    match.error = error.message || 'Match execution failed.';
    try{saveMatch(match);}catch(storageError){console.error('Could not persist failed match:',storageError.message);}
  }
}

function getMatch(id) {
  const match = matches.get(String(id || '').trim().toUpperCase());
  if (!match) throw new Error('Match not found.');
  return match;
}

function publicMatch(match) {
  return {
    id: match.id, matchId: match.id, language: match.language, mapName: match.mapName,
    whiteSubmissionId: match.whiteSubmissionId,
    blackSubmissionId: match.blackSubmissionId,
    status: match.status,
    error: match.error,
    createdAt: match.createdAt,
    gameId: match.gameId, config: match.config,
    result: match.replay?.result || null,
    replay: match.replay ? { matchId: match.replay.matchId, frameCount: match.replay.frames.length } : null,
  };
}

function listHistory(clientId){if(!clientId)throw Error('clientId is required.');return [...matches.values()].filter(m=>m.clientId===clientId).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).map(publicMatch);}

module.exports = { listHistory, matches, createMatch, getMatch, publicMatch };
