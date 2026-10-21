const { prisma } = require("../shared/db.cjs");
const { fail, int } = require("../shared/domain.cjs");
const { entrant, pair } = require("./tournament-presenters.cjs");

async function counts(id) {
  const [accepted, pending, botsReady] = await Promise.all([
    prisma.entry.count({ where: { tournamentId: id, status: "accepted" } }),
    prisma.entry.count({ where: { tournamentId: id, status: "pending" } }),
    prisma.entry.count({
      where: {
        tournamentId: id,
        status: "accepted",
        activeSubmission: { status: "ready" },
      },
    }),
  ]);
  return { accepted, pending, botsReady };
}
async function list(req, res) {
  const offset = int(req.query.offset || 0, 0, 100000, "Offset"),
    limit = int(req.query.limit || 30, 1, 100, "Limit");
  const phase = String(req.query.phase || "");
  const where =
    phase && phase !== "all"
      ? phase === "active"
        ? { phase: { not: "finished" } }
        : { phase }
      : {};
  const [events, total] = await Promise.all([
    prisma.tournament.findMany({
      where: { AND: [where, { phase: { not: "importing" } }] },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.tournament.count({
      where: { AND: [where, { phase: { not: "importing" } }] },
    }),
  ]);
  const ids = events.map((e) => e.id);
  const [statuses, ready] = ids.length
    ? await Promise.all([
        prisma.entry.groupBy({
          by: ["tournamentId", "status"],
          where: {
            tournamentId: { in: ids },
            status: { in: ["accepted", "pending"] },
          },
          _count: { _all: true },
        }),
        prisma.entry.groupBy({
          by: ["tournamentId"],
          where: {
            tournamentId: { in: ids },
            status: "accepted",
            activeSubmission: { status: "ready" },
          },
          _count: { _all: true },
        }),
      ])
    : [[], []];
  const stats = new Map(
    ids.map((id) => [id, { accepted: 0, pending: 0, botsReady: 0 }]),
  );
  for (const row of statuses)
    stats.get(row.tournamentId)[row.status] = row._count._all;
  for (const row of ready)
    stats.get(row.tournamentId).botsReady = row._count._all;
  res.json({
    events: events.map((e) => ({ ...e, counts: stats.get(e.id) })),
    total,
    offset,
    limit,
  });
}
async function state(req, res) {
  const event = await prisma.tournament.findUnique({
    where: { id: req.params.id },
  });
  if (!event || event.phase === "importing") fail(404, "Tournament not found.");
  const offset = int(req.query.offset || 0, 0, 100000, "Offset"),
    limit = int(req.query.limit || 100, 1, 100, "Limit");
  const matchOffset = int(
    req.query.matchOffset || 0,
    0,
    100000,
    "Match offset",
  );
  const [entries, matches, stats, total, matchTotal] = await Promise.all([
    prisma.entry.findMany({
      where: { tournamentId: event.id },
      include: {
        user: true,
        activeSubmission: {
          select: {
            filename: true,
            language: true,
            status: true,
            error: true,
            version: true,
            createdAt: true,
          },
        },
      },
      orderBy: { userId: "asc" },
      skip: offset,
      take: limit,
    }),
    prisma.match.findMany({
      where: { tournamentId: event.id, round: event.round },
      orderBy: { id: "asc" },
      take: 100,
      skip: matchOffset,
    }),
    counts(event.id),
    prisma.entry.count({ where: { tournamentId: event.id } }),
    prisma.match.count({
      where: { tournamentId: event.id, round: event.round },
    }),
  ]);
  const history = await prisma.match.findMany({
    where: {
      tournamentId: event.id,
      status: "finished",
      round: { lt: event.round },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const missingIds = [
    ...new Set(
      [...matches, ...history]
        .flatMap((m) => [m.whiteId, m.blackId])
        .filter((id) => id && !entries.some((e) => e.userId === id)),
    ),
  ];
  const missing = missingIds.length
    ? await prisma.user.findMany({ where: { id: { in: missingIds } } })
    : [];
  let me = null,
    myMatch = null;
  if (req.user) {
    const entry = await prisma.entry.findUnique({
      where: {
        tournamentId_userId: { tournamentId: event.id, userId: req.user.id },
      },
      include: {
        user: true,
        activeSubmission: {
          select: {
            filename: true,
            language: true,
            status: true,
            error: true,
            version: true,
            createdAt: true,
          },
        },
      },
    });
    me = entry ? entrant(entry) : null;
    const match = await prisma.match.findFirst({
      where: {
        tournamentId: event.id,
        round: event.round,
        OR: [{ whiteId: req.user.id }, { blackId: req.user.id }],
      },
    });
    myMatch = match ? pair(match) : null;
  }
  if (myMatch) {
    const ids = [myMatch.white, myMatch.black].filter(
      (id) =>
        id &&
        !entries.some((e) => e.userId === id) &&
        !missing.some((u) => u.id === id),
    );
    if (ids.length)
      missing.push(
        ...(await prisma.user.findMany({ where: { id: { in: ids } } })),
      );
  }
  const receipt = await prisma.syncReceipt.findUnique({
    where: { tournamentId: event.id },
  });
  const archive = receipt?.payload?.complete ? receipt.payload : null;
  const historic = (u) => {
    if (!archive) return u;
    const row = archive.manifest.participants.find(
      (p) => archive.accountMap[p.id] === u.id,
    );
    return row
      ? {
          ...u,
          name: row.name,
          rating: row.rating,
          games: row.games,
          lastDelta: row.lastDelta,
        }
      : u;
  };
  if (me && archive) me = { ...me, ...historic(me) };
  const unfinished = await prisma.match.count({
    where: {
      tournamentId: event.id,
      round: event.round,
      status: { notIn: ["finished", "bye"] },
    },
  });
  res.json({
    ...event,
    history: history.map(pair),
    counts: { ...stats, unfinished },
    players: entries.map((e) => entrant({ ...e, user: historic(e.user) })),
    pairingPlayers: missing
      .map(historic)
      .map((u) => ({ id: u.id, name: u.name, rating: u.rating })),
    pairs: matches.map(pair),
    myEntry: me,
    myMatch,
    pagination: { offset, limit, total, matchOffset, matchTotal },
  });
}
async function rankings(req, res) {
  const offset = int(req.query.offset || 0, 0, 100000, "Offset");
  const receipt = await prisma.syncReceipt.findUnique({
    where: { tournamentId: req.params.id },
  });
  if (receipt) {
    if (!receipt.payload.complete) fail(404, "Tournament not found.");
    const { manifest, accountMap } = receipt.payload;
    const rows = [...manifest.participants].sort(
      (a, b) => b.rating - a.rating || a.name.localeCompare(b.name),
    );
    const page = rows.slice(offset, offset + 100);
    const profiles = await prisma.user.findMany({
      where: { id: { in: page.map((u) => accountMap[u.id]).filter(Boolean) } },
      select: { id: true, appearance: true },
    });
    const appearances = new Map(profiles.map((u) => [u.id, u.appearance]));
    return res.json({
      rankings: page.map((u, i) => ({
        ...u,
        id: accountMap[u.id],
        appearance: appearances.get(accountMap[u.id]) ?? null,
        rank: offset + i + 1,
        joined: true,
        entry: "accepted",
        botReady: false,
        submissionStatus: "archived",
      })),
      total: rows.length,
      offset,
      limit: 100,
    });
  }
  const [entries, total] = await Promise.all([
    prisma.entry.findMany({
      where: { tournamentId: req.params.id, status: "accepted" },
      include: {
        user: true,
        activeSubmission: {
          select: {
            filename: true,
            language: true,
            status: true,
            error: true,
            version: true,
            createdAt: true,
          },
        },
      },
      orderBy: [{ user: { rating: "desc" } }, { user: { name: "asc" } }],
      skip: offset,
      take: 100,
    }),
    prisma.entry.count({
      where: { tournamentId: req.params.id, status: "accepted" },
    }),
  ]);
  res.json({
    rankings: entries.map((e, i) => ({ ...entrant(e), rank: offset + i + 1 })),
    total,
    offset,
    limit: 100,
  });
}

module.exports = { list, state, rankings };
