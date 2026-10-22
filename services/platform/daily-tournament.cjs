const crypto = require('node:crypto');
const { transaction, prisma } = require('../shared/db.cjs');
const { freezeConfig } = require('./game-integration.cjs');
const policy = require('./daily-policy.cjs');
const PAGE = 200;
const { Prisma } = require('@prisma/client');
const emptyStanding = (batchId, userId) => ({ batchId, userId, rating: 1000, games: 0, wins: 0, draws: 0, losses: 0, points: 0, lastDelta: 0 });

async function snapshot(tx, event, date) {
  const cutoff = policy.instant(date, '21:00');
  const entries = await tx.entry.findMany({ where: { tournamentId: event.id, status: 'accepted' }, orderBy: { userId: 'asc' } });
  // Source rows are immutable. Reconstruct missed cutoffs from version history,
  // never from Entry.activeSubmissionId, which may already point at tomorrow's bot.
  const submissions = await tx.submission.findMany({ where: { tournamentId: event.id, createdAt: { lt: cutoff } },
    orderBy: [{ userId: 'asc' }, { version: 'desc' }],
    select: { id: true, userId: true, version: true, readyAt: true, filename: true, language: true, sourceHash: true, createdAt: true } });
  const latest = new Map();
  for (const s of submissions) if (!latest.has(s.userId)) latest.set(s.userId, s);
  const bots = entries.map(e => {
    const s = latest.get(e.userId);
    return { userId: e.userId, submissionId: s?.id || null, version: s?.version || 0,
      filename: s?.filename || null, language: s?.language || null, sourceHash: s?.sourceHash || null,
      submittedAt: s?.createdAt?.toISOString() || null,
      ready: !!s?.readyAt && s.readyAt < cutoff,
      reason: !s ? 'No submission before cutoff' : !s.readyAt || s.readyAt >= cutoff ? 'Bot was not validated before cutoff' : null };
  });
  const id = 'DAY-' + crypto.randomUUID();
  return tx.dailyBatch.create({ data: { id, tournamentId: event.id, date,
    round: Math.round((cutoff - policy.instant(event.startDate, '21:00')) / 86400000) + 1,
    cutoff, publishAfter: policy.instant(date, '21:30'), bots, config: freezeConfig({ ...event, firstSide: 'white' }), expected: bots.length * (bots.length - 1) } });
}
async function schedulePage(tx, batch) {
  const ids = batch.bots.map(b => b.userId), bots = new Map(batch.bots.map(b => [b.userId, b]));
  const rows = [], end = Math.min(batch.expected, batch.scheduled + PAGE);
  for (let sequence = batch.scheduled; sequence < end; sequence++) {
    const [whiteId, blackId] = policy.pairingAt(ids, sequence), a = bots.get(whiteId), b = bots.get(blackId);
    const forfeit = !a.ready || !b.ready;
    // Explicit administrative forfeits are recorded, never fabricated engine runs.
    const score = !a.ready && !b.ready ? .5 : a.ready ? 1 : 0;
    rows.push({ id: 'MATCH-' + crypto.randomUUID(), tournamentId: batch.tournamentId, batchId: batch.id, sequence, round: batch.round,
      whiteId, blackId, whiteSubmissionId: a.submissionId, blackSubmissionId: b.submissionId,
      config: batch.config, status: forfeit ? 'finished' : 'queued',
      ...(forfeit ? { score, result: { score, winner: score === .5 ? null : score === 1 ? 'white' : 'black', reason: 'submission-forfeit', administrative: true,
        whiteReason: a.reason, blackReason: b.reason } } : {}) });
  }
  if (rows.length) {
    await tx.match.createMany({ data: rows });
    const jobs = rows.filter(m => m.status === 'queued').map(m => ({ key: 'match:' + m.id, type: 'match', matchId: m.id }));
    if (jobs.length) await tx.job.createMany({ data: jobs });
  }
  await tx.dailyBatch.update({ where: { id: batch.id }, data: { scheduled: end, state: end === batch.expected ? 'processing' : 'scheduling' } });
}
async function initializeRatings(tx, event, batch) {
  const previous = event.publishedBatchId ? await tx.dailyStanding.findMany({ where: { batchId: event.publishedBatchId } }) : [];
  const old = new Map(previous.map(row => [row.userId, row]));
  const rows = batch.bots.map(bot => ({ ...(old.get(bot.userId) || emptyStanding(batch.id, bot.userId)), batchId: batch.id, lastDelta: 0 }));
  for (let i = 0; i < rows.length; i += PAGE) await tx.dailyStanding.createMany({ data: rows.slice(i, i + PAGE) });
  await tx.dailyBatch.update({ where: { id: batch.id }, data: { state: 'rating' } });
}
async function ratePage(tx, batch) {
  const matches = await tx.match.findMany({ where: { batchId: batch.id, sequence: { gte: batch.ratingCursor } }, orderBy: { sequence: 'asc' }, take: PAGE });
  const ids = [...new Set(matches.flatMap(m => [m.whiteId, m.blackId]))];
  const standings = await tx.dailyStanding.findMany({ where: { batchId: batch.id, userId: { in: ids } } });
  const table = new Map(standings.map(row => [row.userId, row]));
  const changes = [];
  for (const m of matches) {
    if (m.status !== 'finished' || ![0, .5, 1].includes(m.score)) throw Error('Daily batch contains an unscored match.');
    const a = table.get(m.whiteId), b = table.get(m.blackId), whiteBefore = a.rating, blackBefore = b.rating;
    const delta = policy.applyRating(a, b, m.score);
    changes.push({ sequence: m.sequence, whiteBefore, blackBefore, whiteDelta: delta, blackDelta: -delta });
  }
  if (changes.length) {
    const columns = ['whiteBefore', 'blackBefore', 'whiteDelta', 'blackDelta'];
    const assignments = columns.map(column => Prisma.sql`${Prisma.raw('`' + column + '`')} = CASE \`sequence\` ${Prisma.join(changes.map(row => Prisma.sql`WHEN ${row.sequence} THEN ${row[column]}`), ' ')} END`);
    await tx.$executeRaw(Prisma.sql`UPDATE \`Match\` SET ${Prisma.join(assignments, ', ')}, rated = true WHERE batchId = ${batch.id} AND \`sequence\` IN (${Prisma.join(changes.map(row => row.sequence))})`);
    // Only private staging rows are replaced. Published standings live in a
    // different batch and remain readable throughout this transaction.
    await tx.dailyStanding.deleteMany({ where: { batchId: batch.id, userId: { in: ids } } });
    await tx.dailyStanding.createMany({ data: [...table.values()] });
  }
  const cursor = batch.ratingCursor + matches.length;
  await tx.dailyBatch.update({ where: { id: batch.id }, data: { ratingCursor: cursor, ...(cursor === batch.expected ? { state: 'ready' } : {}) } });
}
async function tickEvent(id, now = new Date()) {
  return transaction(async tx => {
    // Same lock as upload, registration and judge settings. All scheduler replicas
    // serialize on this row. Cursors and generated work commit together.
    await tx.$queryRaw`SELECT id FROM Tournament WHERE id=${id} FOR UPDATE`;
    const event = await tx.tournament.findUnique({ where: { id } });
    let changed = false;
    if (!policy.isDaily(event) || event.deletedAt || event.phase === 'finished') return;
    if (policy.started(event, now) && event.phase !== 'live') {await tx.tournament.update({ where: { id }, data: { phase: 'live' } });changed=true;}
    const batches = await tx.dailyBatch.findMany({ where: { tournamentId: id }, orderBy: { date: 'asc' } });
    const existing = new Set(batches.map(b => b.date));
    for (let date = event.startDate; date <= event.endDate && now >= policy.instant(date, '21:00'); date = policy.nextDate(date)) {
      if (!existing.has(date)) { await snapshot(tx, event, date); changed=true; break; }
    }
    const scheduling = batches.find(b => b.state === 'scheduling');
    if (scheduling) {await schedulePage(tx, scheduling);changed=true;}
    const batch = batches.find(b => !b.publishedAt);
    if (!batch) return changed;
    if (batch.state === 'processing' &&
      !(await tx.match.count({ where: { batchId: batch.id, status: { not: 'finished' } } }))) {
      if (await tx.match.count({ where: { batchId: batch.id } }) !== batch.expected) throw Error('Daily match count mismatch.');
      await initializeRatings(tx, event, batch);changed=true;
    } else if (batch.state === 'rating') {await ratePage(tx, batch);changed=true;}
    else if (batch.state === 'ready' && now >= batch.publishAfter) {
      // One publication pointer switches all public standings and match visibility.
      await tx.dailyBatch.update({ where: { id: batch.id }, data: { state: 'published', publishedAt: now } });
      await tx.tournament.update({ where: { id }, data: { publishedBatchId: batch.id, round: batch.round,
        ...(batch.date === event.endDate ? { phase: 'finished' } : {}) } });
      await tx.audit.create({ data: { tournamentId: id, action: 'daily.publish', metadata: { batchId: batch.id, date: batch.date, expected: batch.expected, ratingPolicy: 'tournament-only' } } });
      changed=true;
    }
    return changed;
  }, { isolationLevel: 'ReadCommitted' });
}
let running = false;
async function tick() {
  if (running) return;
  running = true;
  try {
    const events = await prisma.tournament.findMany({ where: { format: policy.FORMAT, deletedAt: null, phase: { not: 'finished' } }, select: { id: true } });
    for (const event of events) {
      try {
        for (let page = 0; page < 8; page++) if (!await tickEvent(event.id)) break;
      } catch (error) { console.error('Daily tournament tick failed:', event.id, error.code || error.message); }
    }
  } finally { running = false; }
}
module.exports = { tick, tickEvent, snapshot, schedulePage, initializeRatings, ratePage, emptyStanding };
