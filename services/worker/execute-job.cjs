const { executionDeadline } = require("../platform/game-integration.cjs");
const { FrameBuffer } = require("./frame-buffer.cjs");
const queue = require("./queue.cjs");
const { loadRunnerInput } = require("./runner-input.cjs");
const { runnerEvents } = require("./runner-events.cjs");

async function execute(job) {
  const started = Date.now();
  console.log(
    JSON.stringify({
      event: "job.started",
      jobId: job.id,
      matchId: job.matchId || null,
      type: job.type,
      attempt: job.attempts,
      queueWaitMs: Math.max(0, started - new Date(job.availableAt).getTime()),
    }),
  );
  const controller = new AbortController();
  const frames = new FrameBuffer((batch) => queue.appendBatch(job, batch), {
    onError: () => controller.abort(),
  });
  const timer = setInterval(async () => {
    try {
      if (!(await queue.heartbeat(job))) controller.abort();
    } catch {
      controller.abort();
    }
  }, 10000);
  try {
    const input = await loadRunnerInput(job);
    const deadline = setTimeout(
      () => controller.abort(),
      executionDeadline(input.config) + 5000,
    );
    let terminal = false;
    try {
      const response = await fetch(
        process.env.RUNNER_URL.replace(/\/$/, "") + "/run",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + process.env.RUNNER_SECRET,
          },
          body: JSON.stringify(input),
          signal: controller.signal,
        },
      );
      if (response.status === 429) {
        await response.body?.cancel();
        await queue.defer(job);
        console.log(
          JSON.stringify({
            event: "job.deferred",
            jobId: job.id,
            matchId: job.matchId || null,
            reason: "runner_busy",
          }),
        );
        return;
      }
      if (!response.ok)
        throw Error(
          "Execution runner refused the job (" + response.status + ").",
        );
      for await (const event of runnerEvents(response.body)) {
        if (event.metadata && input.teams)
          event.metadata = { ...event.metadata, teams: input.teams };
        if (event.type === "frame") {
          await frames.add(event);
          if (event.seq === 0)
            console.log(
              JSON.stringify({
                event: "job.first_frame",
                jobId: job.id,
                matchId: job.matchId || null,
                elapsedMs: Date.now() - started,
              }),
            );
        } else if (["finished", "validated"].includes(event.type)) {
          await frames.close();
          if (!(await queue.finish(job, event)))
            throw Error("Job ownership changed.");
          terminal = true;
          console.log(
            JSON.stringify({
              event: "job.finished",
              jobId: job.id,
              matchId: job.matchId || null,
              elapsedMs: Date.now() - started,
            }),
          );
        } else if (event.type === "error") {
          console.error(
            JSON.stringify({
              event: "job.failed",
              jobId: job.id,
              matchId: job.matchId || null,
              code: ['BOT_INVALID', 'RUNNER_INFRA'].includes(event.code) ? event.code : 'RUNNER_ERROR',
              // Full bot diagnostics stay in the protected job/submission record.
              diagnosticRecord: job.submissionId || job.matchId || job.id,
              elapsedMs: Date.now() - started,
            }),
          );
          await frames.close();
          await queue.failure(
            job,
            event.error,
            event.code === "BOT_INVALID" && job.type === "validate",
          );
          terminal = true;
        }
      }
      if (!terminal)
        throw Error("Runner closed before returning a final result.");
    } finally {
      clearTimeout(deadline);
    }
  } catch (e) {
    await frames.discard();
    const networkCode = e.cause?.code || e.cause?.errors?.[0]?.code;
    const cause =
      frames.error?.message ||
      (e.message === "fetch failed"
        ? `Execution runner connection failed (${networkCode || "network error"}). Check runner health.`
        : e.name === "AbortError"
          ? "Execution stopped: deadline exceeded or worker lease lost."
          : e.message);
    console.error(
      JSON.stringify({
        event: "job.failed",
        jobId: job.id,
        matchId: job.matchId || null,
        code: networkCode || e.code || e.name,
        diagnosticRecord: job.submissionId || job.matchId || job.id,
        elapsedMs: Date.now() - started,
      }),
    );
    await queue.failure(job, cause);
  } finally {
    await frames.discard();
    clearInterval(timer);
  }
}

module.exports = { execute };
