const { prisma } = require("../shared/db.cjs");

// Load the frozen submissions before contacting the execution service.
async function loadRunnerInput(job) {
  let input;
  if (job.type === "validate") {
    const bot = await prisma.submission.findUnique({
      where: { id: job.submissionId },
    });
    input = { type: "validate", id: job.id, bot, config: job.config };
  } else {
    const match = await prisma.match.findUnique({ where: { id: job.matchId } });
    const [white, black] = await Promise.all([
      prisma.submission.findUnique({ where: { id: match.whiteSubmissionId } }),
      prisma.submission.findUnique({ where: { id: match.blackSubmissionId } }),
    ]);
    if (!white || !black) throw Error("Frozen match submission is missing.");
    const users = await prisma.user.findMany({
      where: { id: { in: [match.whiteId, match.blackId] } },
      select: { id: true, name: true },
    });
    input = {
      type: "match",
      id: match.id,
      config: match.config,
      white,
      black,
      teams: match.tournamentId
        ? {
            white:
              users.find((u) => u.id === match.whiteId)?.name || "White player",
            black:
              users.find((u) => u.id === match.blackId)?.name || "Black player",
          }
        : { white: "Your White bot", black: "Your Black bot" },
    };
  }
  return input;
}
module.exports = { loadRunnerInput };
