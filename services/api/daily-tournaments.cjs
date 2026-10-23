const { prisma, transaction } = require('../shared/db.cjs');
const { fail, int } = require('../shared/domain.cjs');
const { eventOwner } = require('./auth.cjs');
const visibility = require('./tournament-visibility.cjs');
const policy = require('../platform/daily-policy.cjs');
const { entrant, pair } = require('./tournament-presenters.cjs');
const { submissionView } = require('./bot-diagnostics.cjs');
const owns = (event, user) => user?.role === 'judge' && user.id === event.ownerId;
const visibleMatches = (user) => ({ OR: [{ batchId: null }, { batch: { publishedAt: { not: null } } },
  ...(user?.role === 'judge' ? [{ tournament: { ownerId: user.id } }] : [])] });
const botSelect = { id: true, filename: true, language: true, status: true, error: true, version: true, createdAt: true };
function participant(entry, standing, viewer, event) {
  return { ...entrant(entry, viewer, event), activeSubmissionId: entry.activeSubmissionId || entry.activeSubmission?.id || null, rating: standing?.rating ?? 1000, games: standing?.games ?? 0,
    lastDelta: standing?.lastDelta ?? 0, wins: standing?.wins ?? 0, draws: standing?.draws ?? 0,
    losses: standing?.losses ?? 0, points: standing?.points ?? 0 };
}
async function readState(req, res) {
  const result = await transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM Tournament WHERE id=${req.params.id} FOR UPDATE`;
    const event = await tx.tournament.findUnique({ where: { id: req.params.id } });
    if (!visibility.canRead(event, req.user)) fail(404, 'Tournament not found.');
    const manager = owns(event, req.user), offset = int(req.query.offset || 0, 0, 100000, 'Offset');
    const matchOffset = int(req.query.matchOffset || 0, 0, 100000000, 'Match offset');
    const entries = await tx.entry.findMany({ where: { tournamentId: event.id }, include: { user: true, activeSubmission: { select: botSelect } }, orderBy: { userId: 'asc' }, skip: offset, take: 100 });
    const published = event.publishedBatchId ? await tx.dailyBatch.findUnique({ where: { id: event.publishedBatchId } }) : null;
    const ratings = published ? await tx.dailyStanding.findMany({ where: { batchId: published.id } }) : [];
    const table = new Map(ratings.map(r => [r.userId, r]));
    const counts = { accepted: await tx.entry.count({ where: { tournamentId: event.id, status: 'accepted' } }),
      pending: await tx.entry.count({ where: { tournamentId: event.id, status: 'pending' } }),
      botsReady: await tx.entry.count({ where: { tournamentId: event.id, status: 'accepted', activeSubmission: { status: 'ready' } } }) };
    const latest = await tx.dailyBatch.findFirst({ where: { tournamentId: event.id }, orderBy: { date: 'desc' } });
    const shownBatch = manager ? latest : published;
    const where = { tournamentId: event.id, batchId: shownBatch?.id || '__no_batch__' };
    const matches = await tx.match.findMany({ where, orderBy: { sequence: 'asc' }, skip: matchOffset, take: 100 });
    const ids = [...new Set(matches.flatMap(m => [m.whiteId, m.blackId]).filter(Boolean))];
    const profiles = ids.length ? await tx.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, appearance: true } }) : [];
    const my = req.user ? await tx.entry.findUnique({ where: { tournamentId_userId: { tournamentId: event.id, userId: req.user.id } }, include: { user: true, activeSubmission: { select: botSelect } } }) : null;
    const dates = await tx.dailyBatch.findMany({ where: { tournamentId: event.id }, orderBy: { date: 'desc' }, select: { id: true, date: true, state: true, expected: true, publishedAt: true, publishAfter: true } });
    const now = new Date();
    const processing = latest && !latest.publishedAt ? { date: latest.date, status: now < latest.publishAfter ? 'processing' : 'delayed',
      ...(manager ? { internalState: latest.state, scheduled: latest.scheduled,
        completed: await tx.match.count({ where: { batchId: latest.id, status: 'finished' } }),
        failed: await tx.match.count({ where: { batchId: latest.id, status: 'failed' } }), expected: latest.expected } : {}) } : null;
    return { ...policy.display(event, now), manager, processing, publishedAt: published?.publishedAt || null, publishedDate: published?.date || null,
      batches: dates.map(b => ({ id: b.id, date: b.date, publishedAt: b.publishedAt, publishAfter: b.publishAfter, ...(manager ? { state: b.state, expected: b.expected } : {}) })),
      players: entries.map(e => participant(e, table.get(e.userId), req.user, event)),
      pairingPlayers: profiles.map(u => ({ ...u, rating: table.get(u.id)?.rating ?? 1000 })),
      pairs: matches.map(m => pair(m, manager)), history: [], myEntry: my ? participant(my, table.get(my.userId), req.user, event) : null, myMatch: null, counts,
      pagination: { offset, limit: 100, total: await tx.entry.count({ where: { tournamentId: event.id } }), matchOffset, matchTotal: await tx.match.count({ where }) } };
  }, { isolationLevel: 'ReadCommitted' });
  res.json(result);
}
async function rankings(req, res) {
  const result = await transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM Tournament WHERE id=${req.params.id} FOR UPDATE`;
    const event = await tx.tournament.findUnique({ where: { id: req.params.id } });
    if (!visibility.canRead(event, req.user)) fail(404, 'Tournament not found.');
    const offset = int(req.query.offset || 0, 0, 100000, 'Offset');
    const rows = event.publishedBatchId ? await tx.dailyStanding.findMany({ where: { batchId: event.publishedBatchId }, orderBy: [{ points: 'desc' }, { rating: 'desc' }, { wins: 'desc' }, { userId: 'asc' }], skip: offset, take: 100 }) : [];
    const entries = await tx.entry.findMany({ where: { tournamentId: event.id, status: 'accepted', ...(event.publishedBatchId ? { userId: { in: rows.map(r => r.userId) } } : {}) }, include: { user: true, activeSubmission: { select: botSelect } },
      ...(!event.publishedBatchId ? { orderBy: { userId: 'asc' }, skip: offset, take: 100 } : {}) });
    const map = new Map(entries.map(e => [e.userId, e]));
    return { rankings: event.publishedBatchId ? rows.map((r, i) => ({ ...participant(map.get(r.userId), r, req.user, event), rank: offset + i + 1 })) : entries.map((e, i) => ({ ...participant(e, undefined, req.user, event), rank: offset + i + 1 })),
      total: await tx.entry.count({ where: { tournamentId: event.id, status: 'accepted' } }), offset, limit: 100, ratingScope: 'tournament', publishedBatchId: event.publishedBatchId };
  }, { isolationLevel: 'ReadCommitted' });
  res.json(result);
}
async function changeSchedule(req, res) {
  await transaction(async tx => {
    const event = await eventOwner(tx, req.params.id, req.user);
    if (!policy.isDaily(event)) {
      if (!['registration', 'preparation'].includes(event.phase) || await tx.match.count({ where: { tournamentId: event.id } }))
        fail(409, 'Only an unplayed registration/preparation tournament can switch format. Existing matches and history are preserved.');
      const dates = policy.schedule(req.body.startDate, req.body.endDate, req.body.startTime);
      if (policy.startsAt(dates) <= new Date()) fail(400, 'Start time must be in the future.');
      await tx.tournament.update({ where: { id: event.id }, data: { ...dates, format: policy.FORMAT, phase: 'registration', firstSide: 'white' } });
      await tx.audit.create({ data: { actorId: req.user.id, tournamentId: event.id, action: 'daily.convert', metadata: dates } });
      return;
    }
    if (event.phase === 'finished') fail(409, 'A finalized tournament cannot be rescheduled.');
    const dates = policy.schedule(event.startDate, req.body.endDate, event.startTime);
    const latest = await tx.dailyBatch.findFirst({ where: { tournamentId: event.id }, orderBy: { date: 'desc' } });
    if (dates.endDate < policy.localDate() || (latest && dates.endDate < latest.date)) fail(409, 'End date cannot precede today or an existing batch. No history or running work can be removed.');
    await tx.tournament.update({ where: { id: event.id }, data: dates });
    await tx.audit.create({ data: { actorId: req.user.id, tournamentId: event.id, action: 'daily.schedule', metadata: { from: event.endDate, to: dates.endDate } } });
  });
  res.json({ ok: true });
}
async function code(req, res) {
  const event = await prisma.tournament.findUnique({ where: { id: req.params.id } });
  if (!visibility.canRead(event, req.user) || !owns(event, req.user)) fail(403, 'Only the organizing judge can inspect participant source.');
  const submission = await prisma.submission.findUnique({ where: { id: req.params.submissionId } });
  if (!submission || submission.tournamentId !== event.id) fail(404, 'Tournament submission not found.');
  const entry = await prisma.entry.findUnique({ where: { tournamentId_userId: { tournamentId: event.id, userId: submission.userId } } });
  if (!entry || entry.status !== 'accepted') fail(403, 'Source inspection is restricted to accepted participants.');
  const user = await prisma.user.findUnique({ where: { id: submission.userId }, select: { id: true, name: true } });
  res.json({ ...submissionView(submission, true), participant: user, readOnly: true });
}
async function versions(req, res) {
  const event = await prisma.tournament.findUnique({ where: { id: req.params.id } });
  if (!visibility.canRead(event, req.user) || !owns(event, req.user)) fail(403, 'Only the organizing judge can inspect participant source.');
  const userId = String(req.query.userId || '');
  const rows = await prisma.submission.findMany({ where: { tournamentId: event.id, userId }, select: botSelect, orderBy: { version: 'desc' }, take: 100 });
  res.json({ submissions: rows.map(s => submissionView(s, true)) });
}
module.exports = { owns, visibleMatches, readState, rankings, changeSchedule, code, versions };
