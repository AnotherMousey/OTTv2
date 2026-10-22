const { prisma, transaction } = require("../shared/db.cjs");
const { fail, int, text, pairEntries } = require("../shared/domain.cjs");
const { eventOwner } = require("./auth.cjs");
const {
  freezeConfig,
  settingsUpdate,
} = require("../platform/game-integration.cjs");
const crypto = require("node:crypto");
const daily = require("../platform/daily-policy.cjs");

const audit = (tx, actor, event, action, metadata = {}) =>
  tx.audit.create({
    data: { actorId: actor.id, tournamentId: event, action, metadata },
  });
async function create(req, res) {
  const body = req.body;
  const dates = daily.schedule(body.startDate, body.endDate, body.startTime);
  if (daily.startsAt(dates) <= new Date()) fail(400, 'Start time must be in the future; registration closes when the tournament starts.');
  const id = crypto.randomUUID();
  const initialConfig = freezeConfig({
    gameId: body.gameId || "ottv2",
    gameConfig: body.gameConfig || {},
    mapId: "standard-9",
    firstSide: "white",
    moveTimeLimitMs: 1000,
  });
  const event = await prisma.tournament.create({
    data: {
      id,
      name: text(body.name, 2, 80, "Tournament name"),
      description: text(
        body.description || "University bot programming tournament",
        1,
        240,
        "Description",
      ),
      ownerId: req.user.id,
      format: daily.FORMAT,
      ...dates,
      capacity: int(body.capacity || 4000, 2, 4000, "Capacity"),
      gameId: body.gameId || "ottv2",
      gameConfig: body.gameConfig || {},
      ...(initialConfig._game.id === "ottv2"
        ? {
            maxTurns: initialConfig.maxTurns,
            moveTimeLimitMs: initialConfig.timeTurnLimit,
          }
        : {}),
    },
  });
  await audit(prisma, req.user, id, "tournament.create");
  res.status(201).json(event);
}
async function join(req, res) {
  if (req.user.role !== "player") fail(403, "Join using a player account.");
  await transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM Tournament WHERE id=${req.params.id} FOR UPDATE`;
    const event = await tx.tournament.findUnique({
      where: { id: req.params.id },
    });
    if (!require("./tournament-visibility.cjs").canRead(event, req.user)) fail(404, "Tournament not found.");
    if (event.phase !== "registration" || daily.started(event))
      fail(409, "Tournament registration is closed.");
    if (event.registrationOpen === false)
      fail(409, "The organizer has closed registration for this tournament.");
    const existing = await tx.entry.findUnique({
      where: {
        tournamentId_userId: { tournamentId: event.id, userId: req.user.id },
      },
    });
    if (existing && ["accepted", "pending"].includes(existing.status)) return;
    if (
      (await tx.entry.count({
        where: {
          tournamentId: event.id,
          status: { in: ["pending", "accepted"] },
        },
      })) >= event.capacity
    )
      fail(409, "Tournament is full.");
    await tx.entry.upsert({
      where: {
        tournamentId_userId: { tournamentId: event.id, userId: req.user.id },
      },
      create: { tournamentId: event.id, userId: req.user.id },
      update: { status: "pending" },
    });
    await audit(tx, req.user, event.id, "entry.request");
  });
  res.json({ ok: true });
}
async function review(req, res) {
  await transaction(async (tx) => {
    const event = await eventOwner(tx, req.params.id, req.user);
    if (event.phase !== "registration" || daily.started(event)) fail(409, "Entry review is closed.");
    const status =
      req.body.accept === true
        ? "accepted"
        : req.body.accept === false
          ? "declined"
          : fail(400, "accept must be true or false.");
    const where = {
      tournamentId: event.id,
      status: "pending",
      ...(req.body.userId
        ? { userId: text(req.body.userId, 1, 30, "User id") }
        : {}),
    };
    if (!req.body.userId && req.body.all !== true)
      fail(400, "Choose a participant.");
    await tx.entry.updateMany({ where, data: { status } });
    await audit(tx, req.user, event.id, "entry.review", {
      status,
      all: req.body.all === true,
    });
  });
  res.json({ ok: true });
}
// Pauses new entry requests only; pending entries can still be reviewed.
async function registration(req, res) {
  if (typeof req.body.open !== "boolean") fail(400, "open must be true or false.");
  await transaction(async (tx) => {
    const event = await eventOwner(tx, req.params.id, req.user);
    if (event.phase !== "registration" || daily.started(event))
      fail(409, "Registration has already ended.");
    await tx.tournament.update({
      where: { id: event.id },
      data: { registrationOpen: req.body.open },
    });
    await audit(tx, req.user, event.id, "tournament.registration", {
      open: req.body.open,
    });
  });
  res.json({ ok: true, registrationOpen: req.body.open });
}
async function settings(req, res) {
  await transaction(async (tx) => {
    const event = await eventOwner(tx, req.params.id, req.user);
    if (daily.started(event) || !["registration", "preparation"].includes(event.phase))
      fail(409, "Settings are locked.");
    const change = settingsUpdate(event, req.body),
      config = change.data;
    if (
      change.generic &&
      (await tx.entry.count({
        where: { tournamentId: event.id, activeSubmissionId: { not: null } },
      }))
    )
      fail(409, "Change game settings before accepting bot submissions.");
    await tx.tournament.update({ where: { id: event.id }, data: config });
    if (change.revalidate) {
      const entries = await tx.entry.findMany({
        where: {
          tournamentId: event.id,
          status: "accepted",
          activeSubmissionId: { not: null },
        },
      });
      const ids = entries.map((entry) => entry.activeSubmissionId);
      if (ids.length)
        await tx.$queryRaw`SELECT id FROM Job WHERE submissionId IN (${require("@prisma/client").Prisma.join(ids)}) ORDER BY id FOR UPDATE`;
      for (const entry of entries) {
        await tx.submission.update({
          where: { id: entry.activeSubmissionId },
          data: { status: "queued", error: null, readyAt: null },
        });
        await tx.job.update({
          where: { key: "validate:" + entry.activeSubmissionId },
          data: {
            status: "queued",
            claim: null,
            leaseUntil: null,
            attempts: 0,
            availableAt: new Date(),
            error: null,
            config: freezeConfig({ ...event, ...config }, { validation: true }),
          },
        });
      }
    }
    await audit(tx, req.user, event.id, "settings.update", config);
  });
  res.json({ ok: true });
}
async function advance(req, res) {
  await transaction(async (tx) => {
    const e = await eventOwner(tx, req.params.id, req.user);
    if (daily.isDaily(e)) fail(409, "Daily tournaments advance automatically. Use schedule settings to change the end date.");
    if (e.phase === "registration") {
      if (
        await tx.entry.count({
          where: { tournamentId: e.id, status: "pending" },
        })
      )
        fail(409, "Review pending entries first.");
      if (
        (await tx.entry.count({
          where: { tournamentId: e.id, status: "accepted" },
        })) < 2
      )
        fail(409, "Accept at least two players.");
      await tx.tournament.update({
        where: { id: e.id },
        data: { phase: "preparation" },
      });
    } else if (e.phase === "preparation") {
      const entries = await tx.entry.findMany({
        where: { tournamentId: e.id, status: "accepted" },
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
      if (
        entries.length < 2 ||
        entries.some((p) => p.activeSubmission?.status !== "ready")
      )
        fail(409, "Every accepted player needs a validated bot.");
      const history = await tx.match.findMany({
        where: { tournamentId: e.id },
        select: { whiteId: true, blackId: true },
      });
      const pairs = pairEntries(entries, history, e.round);
      const matches = pairs.map(([a, b]) => ({
        id: "MATCH-" + crypto.randomUUID(),
        tournamentId: e.id,
        round: e.round,
        whiteId: a.userId,
        blackId: b?.userId || null,
        whiteSubmissionId: a.activeSubmissionId,
        blackSubmissionId: b?.activeSubmissionId || null,
        whiteBefore: a.user.rating,
        blackBefore: b?.user.rating || 1000,
        status: b ? "scheduled" : "bye",
        rated: !b,
        config: freezeConfig(e),
      }));
      await tx.match.createMany({ data: matches });
      await tx.tournament.update({
        where: { id: e.id },
        data: { phase: "pairing" },
      });
    } else if (e.phase === "pairing") {
      const matches = await tx.match.findMany({
        where: { tournamentId: e.id, round: e.round, status: "scheduled" },
      });
      await tx.job.createMany({
        data: matches.map((m) => ({
          key: "match:" + m.id,
          type: "match",
          matchId: m.id,
        })),
        skipDuplicates: true,
      });
      await tx.match.updateMany({
        where: { tournamentId: e.id, round: e.round, status: "scheduled" },
        data: { status: "queued" },
      });
      await tx.tournament.update({
        where: { id: e.id },
        data: { phase: "live" },
      });
    } else if (e.phase === "live") {
      if (
        await tx.match.count({
          where: {
            tournamentId: e.id,
            round: e.round,
            status: { notIn: ["finished", "bye"] },
          },
        })
      )
        fail(
          409,
          "Wait for all matches; retry failed infrastructure jobs before advancing.",
        );
      await tx.tournament.update({
        where: { id: e.id },
        data:
          e.round >= e.totalRounds
            ? { phase: "finished" }
            : { phase: "preparation", round: e.round + 1 },
      });
    } else fail(409, "Tournament is already finished.");
    await audit(tx, req.user, e.id, "phase.advance", {
      from: e.phase,
      round: e.round,
    });
  });
  res.json({ ok: true });
}

module.exports = { create, join, review, registration, settings, advance, audit };
