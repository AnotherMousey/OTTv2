# Verification record — 2026-10-14

Source: uploaded OTTv2-main(10).zip. Node v24.19.0. Dependency versions from supplied locks; no new npm dependencies.

| Check | Actual result | Scope / limit |
|---|---|---|
| Baseline after dependency install and Prisma generation | 14 backend + 29 frontend tests pass | Original scripts; no MySQL integration |
| Final `npm test` | 20 backend + 29 frontend tests pass | Includes non-board plugin, bounded cancellation and sync service tests with a simulated transaction store |
| `node --test tests/configurable.test.mjs tests/integration.test.mjs tests/bot-runners.test.mjs` | 9 pass, 1 skip | Python and C++ actual process/SDK matches, engine/map/replay and legacy HTTP flow; Java compiler/runtime absent |
| `npm --prefix frontend run build` | pass | Vite 8.3.4 from supplied lock; 61 modules; existing frontend source |
| `prisma generate` | pass | Client generated for added schema fields/models |
| `prisma validate` with dummy local `_test` URL | pass | Schema syntax only; no DB connection or migration |
| HTTP smoke | pass | `/health`, `/api/games/current`, `/app/`, `/app/fonts/PixeloidSans.ttf` return expected JSON/HTML/font MIME |
| `git diff --check` | pass | Patch whitespace |
| Frontend source/assets diff | zero files changed | File preservation; no browser screenshot comparison |
| Pairing benchmark | 4,000 participants, 10 rounds, 2,000 pairs/round, 4.783–14.495 ms/round | In-memory only; excludes DB/bots/Docker/HTTP |
| `npm run test:sync:db` | 1 skipped | TEST_DATABASE_URL absent; MySQL not available |
| Existing `npm run test:db` | not run | Requires isolated MySQL database |
| Docker build/compose, LAN and disconnected runtime | not run | Docker binary/daemon absent |
| 4,000-user complete tournament / 5-hour acceptance | not run | Planning formula and measurement procedure in audit report; no capacity certification |

Raw logs: `docs/verification/*.txt`; benchmark JSON included separately.

Sync unit checks exercise the real service functions with a simulated store: begin twice, interrupted completion, manifest/mapping conflicts, part twice, finalization twice, stable mapped IDs and no user-rating writes. They do not prove MySQL row-lock behavior. `services/tests/sync.integration.cjs` adds real HTTP/MySQL tests for concurrent duplicate parts, rollback and no global rating writes, and is deliberately skipped without an explicit disposable DB.

## Run database acceptance locally

Use a new disposable MySQL 8.4 database ending `_test`. No production URL.

```bash
export DATABASE_URL='mysql://TEST_USER:TEST_PASSWORD@127.0.0.1:3306/ottv2_test'
npm run db:migrate
npm run db:generate
npm run test:db
export TEST_DATABASE_URL="$DATABASE_URL"
npm run test:sync:db
```

Both integration suites clear their test database tables. Run them sequentially. Never reuse user/production data. Test credentials above are placeholders.

## Offline acceptance before an actual exam

1. Build images, start stack, import a small account list; verify real Python/C++/Java submissions become ready.
2. Run two rounds including a bye and replay; stop worker during a match, restart and verify retry/runId fencing and one rating application.
3. Disconnect Internet; cold restart stack and access `/app/` from host and LAN client; verify font/assets, practice and tournament work.
4. Export finished event; import to staging with reviewed account mapping. Interrupt uploads, repeat import, confirm one Match/Frame set and unchanged global User rating/game counters.
5. Compare light/dark/desktop/mobile frontend rendering with approved baseline; measure startup and completed matches per minute under actual machine limits.

No production deployment, GitHub push or live migration was performed.
