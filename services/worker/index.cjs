const { execute } = require("./execute-job.cjs");
const { prisma } = require("../shared/db.cjs");
const queue = require("./queue.cjs");

let healthPromise,
  healthUntil = 0,
  lastHealthWarning = 0;
async function runnerReady() {
  if (healthPromise && Date.now() < healthUntil) return healthPromise;
  healthUntil = Date.now() + 1000;
  healthPromise = (async () => {
    try {
      const response = await fetch(
        process.env.RUNNER_URL.replace(/\/$/, "") + "/health",
        { signal: AbortSignal.timeout(3000) },
      );
      if (!response.ok) throw Error("Runner health HTTP " + response.status);
      const health = await response.json();
      if (!health.ok) throw Error("Runner is not ready.");
      return (
        !Number.isFinite(health.active) ||
        health.active <
          (Number.isInteger(health.capacity) && health.capacity > 0
            ? health.capacity
            : Number(process.env.RUNNER_CONCURRENCY || 2))
      );
    } catch (error) {
      if (Date.now() - lastHealthWarning > 30000) {
        lastHealthWarning = Date.now();
        console.error(
          JSON.stringify({
            event: "runner.unavailable",
            code: error.cause?.code || error.name,
          }),
        );
      }
      return false;
    }
  })();
  return healthPromise;
}
async function main() {
  if (!process.env.RUNNER_URL || !process.env.RUNNER_SECRET)
    throw Error("Set RUNNER_URL and RUNNER_SECRET before starting the worker.");
  let stopping = false;
  process.on("SIGTERM", () => (stopping = true));
  process.on("SIGINT", () => (stopping = true));
  await prisma.$connect();
  const daily = require('../platform/daily-tournament.cjs');
  await daily.tick();
  const scheduler = setInterval(() => daily.tick().catch(error => console.error('Daily scheduler failed:', error.code || error.name)), 1000);
  const cleanup = setInterval(() => {
    queue.recover().catch((e) => console.error("Queue recovery failed"));
    prisma.session
      .deleteMany({ where: { expiresAt: { lt: new Date() } } })
      .catch(() => {});
    prisma.rateBucket
      .deleteMany({ where: { expiresAt: { lt: new Date() } } })
      .catch(() => {});
  }, 30000);
  const concurrency = Math.max(
    1,
    Math.min(
      64,
      Number(process.env.RUNNER_CONCURRENCY) || 2,
      Number(process.env.WORKER_CONCURRENCY) || 2,
    ),
  );
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (!stopping) {
        try {
          if (!(await runnerReady())) {
            await new Promise((r) => setTimeout(r, 1500));
            continue;
          }
          const job = await queue.claim();
          if (job) await execute(job);
          else await new Promise((r) => setTimeout(r, 1500));
        } catch (e) {
          console.error("Worker iteration failed:", e.code || e.name);
          await new Promise((r) => setTimeout(r, 3000));
        }
      }
    }),
  );
  clearInterval(cleanup);
  clearInterval(scheduler);
  await prisma.$disconnect();
}
if (require.main === module)
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
module.exports = { execute, runnerReady };
