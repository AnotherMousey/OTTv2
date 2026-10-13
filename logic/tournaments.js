const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {createSubmission, getSubmission} = require('./submissions');
const {createMatch, getMatch, publicMatch} = require('./match');

const dataDirectory = path.resolve(process.env.DATA_DIR || path.join(__dirname, '../data'));
const tournamentDirectory = path.join(dataDirectory, 'tournaments');
const tournaments = new Map();

function ensureDirectory() { fs.mkdirSync(tournamentDirectory, {recursive: true, mode: 0o700}); }
function safeId(value) {
  const id = String(value || '').trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{2,63}$/.test(id)) throw new Error('Tournament id must contain 3-64 lowercase letters, numbers, or hyphens.');
  return id;
}
function fileFor(id) { return path.join(tournamentDirectory, `${safeId(id)}.json`); }
function save(tournament) {
  ensureDirectory();
  const target = fileFor(tournament.id);
  const temp = `${target}.${crypto.randomBytes(6).toString('hex')}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(tournament, null, 2), {mode: 0o600});
  fs.renameSync(temp, target);
}
function load() {
  ensureDirectory();
  for (const file of fs.readdirSync(tournamentDirectory).filter(name => name.endsWith('.json'))) {
    const tournament = JSON.parse(fs.readFileSync(path.join(tournamentDirectory, file), 'utf8'));
    tournaments.set(tournament.id, tournament);
  }
}
function getTournament(id) {
  const tournament = tournaments.get(safeId(id));
  if (!tournament) throw new Error('Tournament not found.');
  return tournament;
}
function publicTournament(tournament) {
  return {
    id: tournament.id, name: tournament.name, rounds: tournament.rounds, currentRound: tournament.currentRound,
    status: tournament.status, coefficient: tournament.coefficient,
    players: tournament.players.map(({username, coefficient, points, wins, draws, losses, latestCodeAt}) => ({username, coefficient, points, wins, draws, losses, latestCodeAt})),
    pairings: tournament.pairings.map(pairing => ({...pairing, match: pairing.matchId ? publicMatch(getMatch(pairing.matchId)) : null})),
    createdAt: tournament.createdAt,
  };
}
function createTournament({id, name, rounds, coefficient = 'points'}) {
  id = safeId(id);
  if (tournaments.has(id)) throw new Error('Tournament already exists.');
  rounds = Number(rounds);
  if (!Number.isInteger(rounds) || rounds < 1 || rounds > 100) throw new Error('rounds must be an integer from 1 to 100.');
  const tournament = {id, name: String(name || id).trim().slice(0, 120), rounds, coefficient: String(coefficient || 'points'), status: 'registration', currentRound: 0, players: [], pairings: [], createdAt: new Date().toISOString()};
  tournaments.set(id, tournament); save(tournament); return publicTournament(tournament);
}
function registerPlayer(id, {username, coefficient = 1000}) {
  const tournament = getTournament(id);
  if (tournament.status !== 'registration') throw new Error('Tournament registration is closed.');
  if (tournament.players.some(player => player.username === username)) throw new Error('Player is already registered.');
  coefficient = Number(coefficient);
  if (!Number.isFinite(coefficient)) throw new Error('coefficient must be a number.');
  tournament.players.push({username, coefficient, points: 0, wins: 0, draws: 0, losses: 0, latestSubmissionId: null, latestCodeAt: null});
  save(tournament); return publicTournament(tournament);
}
function updateCode(id, username, {source, language = 'python'}) {
  const tournament = getTournament(id);
  const player = tournament.players.find(entry => entry.username === username);
  if (!player) throw new Error('Player is not registered in this tournament.');
  if (tournament.status === 'finished' || (tournament.currentRound > 0 && tournament.pairings.some(pairing => pairing.round === tournament.currentRound && pairing.status === 'queued'))) throw new Error('Code can only be updated before the next round starts.');
  const submission = createSubmission({playerId: username, source, language, clientId: username});
  player.latestSubmissionId = submission.id;
  player.latestCodeAt = new Date().toISOString();
  save(tournament); return {submission, tournament: publicTournament(tournament)};
}
function randomWeightedPlayers(players) {
  const remaining = [...players]; const ordered = [];
  while (remaining.length) {
    const total = remaining.reduce((sum, player) => sum + Math.max(1, player.coefficient), 0);
    let target = Math.random() * total;
    const index = remaining.findIndex(player => (target -= Math.max(1, player.coefficient)) <= 0);
    ordered.push(remaining.splice(index < 0 ? remaining.length - 1 : index, 1)[0]);
  }
  return ordered;
}
function finishPreviousRound(tournament) {
  if (!tournament.currentRound) return;
  const previous = tournament.pairings.filter(pairing => pairing.round === tournament.currentRound);
  if (previous.some(pairing => !['finished', 'draw', 'bye'].includes(pairing.status))) throw new Error('The previous round has not finished.');
  for (const pairing of previous) {
    if (pairing.applied) continue;
    const result = getMatch(pairing.matchId).replay?.result;
    const white = tournament.players.find(player => player.username === pairing.white);
    const black = tournament.players.find(player => player.username === pairing.black);
    if (!result || result.winner === 'draw' || !result.winner) { white.draws++; black.draws++; white.points++; black.points++; }
    else { const winner = result.winner === 'white' ? white : black; const loser = result.winner === 'white' ? black : white; winner.wins++; loser.losses++; winner.points += 3; }
    pairing.applied = true;
  }
}
function startNextRound(id) {
  const tournament = getTournament(id);
  for (const pairing of tournament.pairings.filter(entry => entry.round === tournament.currentRound && entry.matchId)) {
    pairing.status = getMatch(pairing.matchId).status;
  }
  finishPreviousRound(tournament);
  if (tournament.currentRound >= tournament.rounds) { tournament.status = 'finished'; save(tournament); return publicTournament(tournament); }
  if (tournament.players.length < 2) throw new Error('At least two players are required.');
  if (tournament.players.some(player => !player.latestSubmissionId)) throw new Error('Every player must submit code before the next round.');
  const ordered = randomWeightedPlayers(tournament.players);
  const round = ++tournament.currentRound;
  tournament.status = round === tournament.rounds ? 'running-final' : 'running';
  tournament.pairings = tournament.pairings.filter(pairing => pairing.round !== round);
  for (let index = 0; index + 1 < ordered.length; index += 2) {
    const white = ordered[index]; const black = ordered[index + 1];
    const match = createMatch({whiteSubmissionId: white.latestSubmissionId, blackSubmissionId: black.latestSubmissionId});
    tournament.pairings.push({round, white: white.username, black: black.username, matchId: match.id, status: 'queued', applied: false});
  }
  if (ordered.length % 2) { const bye = ordered.at(-1); bye.points += 3; bye.wins++; tournament.pairings.push({round, white: bye.username, black: null, matchId: null, status: 'bye', applied: true}); }
  save(tournament); return publicTournament(tournament);
}
function syncTournament(id) {
  const tournament = getTournament(id);
  for (const pairing of tournament.pairings) if (pairing.matchId) { const match = getMatch(pairing.matchId); pairing.status = match.status; }
  if (tournament.currentRound === tournament.rounds && tournament.pairings.filter(pairing => pairing.round === tournament.currentRound).every(pairing => pairing.status === 'finished' || pairing.status === 'bye')) tournament.status = 'finished';
  save(tournament); return publicTournament(tournament);
}
load();
module.exports = {tournaments, createTournament, getTournament, publicTournament, registerPlayer, updateCode, startNextRound, syncTournament};
