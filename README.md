# OTTv2 — Bot Tournament Platform

A university bot tournament platform with a pixel-art React interface, a Node.js API, MySQL persistence, and isolated Python, Java, and C++ bot execution. Players prepare bots; judges organize tournaments; spectators follow live matches and replays.

## Features

- **Daily tournaments:** Judge-configured date ranges, enrollment approval, a complete double round robin every evening, immutable bot snapshots, delayed result publication, cumulative standings, and tournament-specific Elo.
- **Judge tools:** live internal match results, read-only participant source inspection, exact match-version links, and end-date adjustment.
- **Practice and replay:** private two-bot practice, account-owned history, live spectating, and recorded match playback.
- **Accounts:** player and judge roles, judge-created accounts, optional player self-registration, and validated bulk CSV import.
- **Account settings:** team-name editing with a live player-card preview, password changes with validation, animated pixel-eye password reveal, and character customization.
- **Interface:** original pixel characters and fonts, responsive layouts, light/dark themes, and an expandable profile pass showing the actual account and saved appearance.
- **Interactive Home:** selectable hammer/paper/scissors artwork, moving landscapes, mascot and trophy interactions, and a moving miniature board. The miniature board is Home artwork, separate from tournament game state.
- **Theme control:** vivid daytime and moonlit representations with a pixel-iris transition where supported; motion respects system reduced-motion preferences and page visibility. No visible artwork pause toggle is added.
- **Offline events:** a local Docker stack plus authenticated tournament export/import for reviewed synchronization.

There is **no built-in production username or password**. Current accounts, submissions, jobs, and recordings use Prisma/MySQL; the legacy JSON backend is not the production entry point.

## Daily tournament schedule

All tournament dates and deadlines use **Asia/Ho_Chi_Minh (UTC+07:00)**.

- The Judge sets inclusive start and end dates. Registration and entry approval close at **00:00 on the start date**. Extending the end date does not reopen registration.
- At **21:00 each included day**, the server freezes the accepted roster, selected bot versions and game configuration. Every pair plays **two matches with reversed sides**, giving `n × (n − 1)` matches per evening. Participants are not eliminated between days.
- Tournament bot submissions lock during **[21:00, 21:30)**. At 21:30 they reopen, even if matches are delayed. Later uploads affect future batches; existing snapshots remain unchanged. Practice remains available.
- Results, cumulative standings and **tournament-only Elo** publish together **at or after 21:30**, once the entire batch and its private rating calculations are complete. Players retain the last published standings while processing continues. No partial outcomes or outcome-revealing replays are exposed.
- The organizing Judge can view internal results as matches finish and inspect participant source code read-only. This does not grant access to other Judges' tournaments.
- A missing or not-yet-validated selected bot at the cutoff forfeits against a ready opponent. If both bots are unavailable, the system records an administrative draw. Infrastructure failures instead hold publication for retry.
- Tournament Elo starts at **1000**, uses **K = 32**, and applies in deterministic pairing order. Global account Elo is unchanged. Standings sort by cumulative points, tournament Elo, wins, then stable participant ID.
- The Judge can change the end date before finalization, without removing existing batches or published history. Final standings appear after the final included day's batch publishes.

Keep at least one **always-running worker**: it runs both the execution queue and daily scheduler. The API alone does not run scheduled tournament work. The 30-minute processing window is a target, not a capacity guarantee: 2,000 participants produce **3,998,000 matches per evening**.

Existing played events retain their legacy format and history. An organizing Judge can switch an unplayed registration/preparation event to the daily format while retaining entries and submitted bots.

See [daily tournament rules, APIs, migration and run commands](docs/DAILY_TOURNAMENTS.md) and the [verification record](docs/DAILY_TOURNAMENT_VERIFICATION.md).

## Architecture

| Component | Source | Responsibility |
| --- | --- | --- |
| Frontend | `frontend/src/` | React/Vite UI, account workspace, tournament views, spectating, replay |
| API | `services/api/` | Authentication, permissions, accounts, tournaments, bot uploads, match reads |
| Worker | `services/worker/` | Durable queue claims, runner communication, frames, results, daily scheduling and batch publication |
| Runner | `services/runner/` | Docker-based bot compilation and execution |
| Shared services | `services/shared/`, `services/platform/` | Database access, validation, readiness and game integration |
| Game logic | `logic/games/ottv2/` | OTTv2 rules, configuration and engine; registry in `logic/games/registry.js` |
| Bot SDKs | `logic/sdk/` | Python, Java and C++ interfaces |
| Persistence | `prisma/` | MySQL schema and migrations |
| Event synchronization | `services/sync/`, `scripts/tournament-sync.cjs` | Export, mapping review and import |

The API does not compile or execute uploaded bot source. The worker sends execution requests to the dedicated runner. MySQL stores the durable platform data; runner containers handle temporary execution files.

## Requirements

- **Node.js 24.x**, matching both package manifests, the Dockerfile and `render.yaml`.
- **Docker Engine with Compose**, using Linux containers, for the full local stack and bot execution.
- **MySQL 8.4** for the supplied Compose setup.

The committed root/frontend `.node-version` files and some older documentation still say Node 26. Use Node 24 explicitly for the current configuration.

## Quick start: local Docker stack

Clone the repository and create local configuration:

```bash
git clone https://github.com/AnotherMousey/OTTv2.git
cd OTTv2
cp .env.example .env
```

Edit `.env` before starting. Set distinct, URL-safe `MYSQL_PASSWORD` and `MYSQL_ROOT_PASSWORD` values, your own `OPERATOR_USERNAME` and `OPERATOR_NAME`, an `OPERATOR_PASSWORD` of 12–128 characters, and a random shared `RUNNER_SECRET`. Generate a secret with:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Build the bot image, start the stack, and create the first judge:

```bash
docker build -f services/runner/Bot.Dockerfile -t ottv2-bot:latest .
docker compose -f compose.local.yaml up -d --build
docker compose -f compose.local.yaml exec api npm run db:bootstrap
```

Wait for the API to be ready before bootstrapping. Bootstrap creates a judge and refuses to overwrite an existing account or reset its password. Log in with the credentials you configured.

Start the frontend development server:

```bash
npm --prefix frontend ci
npm --prefix frontend run dev
```

Open **http://127.0.0.1:5173**. Vite proxies API requests to `http://127.0.0.1:3000`. The API also serves its Docker-built frontend at **http://127.0.0.1:3000/app/**.

Check readiness or inspect service logs:

```bash
curl --fail http://127.0.0.1:3000/ready
docker compose -f compose.local.yaml logs --tail=100 api worker runner
```

The local MySQL named volume retains data across container restarts. To stop services while retaining it:

```bash
docker compose -f compose.local.yaml down
```

Do not add `--volumes` unless you intend to erase that local database.

## Accounts and tournament workflow

The implemented roles are **player** and **judge**. A separate Admin role is not currently implemented.

1. Log in as the bootstrapped judge. Open **Manage accounts** to create player or judge accounts using username, team name, password, and role.
2. Enable self-registration only when desired. Self-registration creates players; it cannot grant judge access.
3. For CSV import, use the header below. Review validation errors before importing; the API accepts 1–500 accounts per batch.

   ```csv
   username,name,password,role
   ```

   Keep credential files private. Usernames use 3–32 letters, numbers, dots, underscores or hyphens; team names use 2–80 characters; passwords use 12–128 characters. An empty team-name field defaults to the username. Supported roles are `player` and `judge`.

4. Create a tournament with a future start date and an inclusive end date. Players request enrollment; the organizing Judge accepts entries before the start date.
5. Accepted players upload and replace bots outside the daily lock. Finish validation before 21:00. Validation checks compilation/startup and a legal initial move; it does not prove correct behavior for an entire match.
6. The worker automatically schedules each evening's double round robin using frozen bot versions. The organizing Judge can inspect live internal results and read-only source.
7. At or after 21:30, the complete batch publishes with cumulative standings and updated tournament Elo. Failed infrastructure jobs delay publication until resolved; they do not extend the upload lock.
8. Continue through the final date. The Judge may adjust the end date before finalization. Practice matches do not change Elo.

Players can edit their team name, change their password, and customize their original character through the account menu. Public tournament matches support spectating; private practice recordings require their owner's session.

## Configuration

Start from [`.env.example`](.env.example) and [`frontend/.env.example`](frontend/.env.example).

| Variable | Used by | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | API, worker, database commands | MySQL application connection |
| `MIGRATION_DATABASE_URL` | Migration wrapper | Optional separate connection with migration privileges |
| `ALLOWED_ORIGINS` | API | Comma-separated exact frontend origins, without paths or trailing slashes |
| `PORT` | API | Listening port; defaults to 3000 outside Docker |
| `RUNNER_URL` | Worker | Execution runner origin |
| `RUNNER_SECRET` | Worker and runner | Matching authentication secret |
| `WORKER_CONCURRENCY` | Worker | Parallel job capacity |
| `RUNNER_CONCURRENCY` | Runner | Parallel execution capacity |
| `OPERATOR_USERNAME`, `OPERATOR_NAME`, `OPERATOR_PASSWORD` | Bootstrap | Initial judge identity and credentials |
| `VITE_API_BASE_URL` | Frontend build | API origin, without `/api`; leave unset for the local Vite proxy |

Root services read environment variables; do not assume every npm command loads `.env`. For example, to run the API with a local environment file explicitly:

```bash
node --env-file=.env services/api/index.cjs
```

To start the worker with the same environment file:

```bash
node --env-file=.env services/worker/index.cjs
```

The worker also requires the configured execution runner. That API command starts only the API. It does not migrate the database, bootstrap accounts, start a worker, or start a runner. The local Compose quick start handles service configuration for you.

## Build and checks

From the repository root:

```bash
npm ci
npm run db:generate
npm --prefix frontend ci
npm test
npm --prefix frontend run build
```

`npm test` runs the committed service tests followed by the frontend tests. These checks do not establish production capacity or verify isolation on your deployment host.

For the daily SQL integration suite, use an isolated, migrated database whose name ends in `_test`, and opt in explicitly:

```bash
OTT_DAILY_DB_TEST=1 npm run test:daily:db
```

Set `DATABASE_URL` to that test database before running the command. Do not use production credentials.

`npm run build` generates Prisma Client, installs frontend dependencies, and builds `frontend/dist`. `npm run dev` watches the API only; run the frontend development server separately.

Some package scripts currently reference missing files: `test:db`, `test:sync:db`, and `test:deployment:db`. They are not usable verification steps in this checkout until their target files are restored. The older root README's `samples` script is also no longer defined.

## Deployment

The committed deployment configuration separates the following services:

| Service | Configuration / target |
| --- | --- |
| API | `railway.json`, using the root `Dockerfile`; Railway beside MySQL |
| MySQL | Railway database with persistent storage |
| Worker | `render.yaml`; Render background worker |
| Frontend | `render.yaml`; Render Static Site |
| Runner | `services/runner/compose.yaml`; dedicated Docker-capable Linux host |

See [DEPLOYMENT.md](DEPLOYMENT.md) for infrastructure setup, runner restrictions and operating details. Where older sections mention Node 26, use **Node 24.x** as declared by the current package manifests.

For a separately hosted static frontend, including Vercel, build `frontend/` with `npm ci` and `npm run build`, then publish `dist`. Set `VITE_API_BASE_URL` before building and add the frontend origin to the API's `ALLOWED_ORIGINS`. Changing the API URL requires rebuilding the frontend. The application uses hash routes.

Before deploying the daily tournament update, apply its migration and deploy matching API and worker versions:

```bash
npm ci
npm run db:generate
npm run db:migrate:deploy
npm --prefix frontend ci
npm --prefix frontend run build
```

Provide database variables through the process environment; the migration wrapper uses `MIGRATION_DATABASE_URL` when set, otherwise `DATABASE_URL`. Keep the worker running continuously with the existing runner credentials. No extra scheduler secret is required.

Railway runs `scripts/migrate.cjs` before starting the API; `npm start` also runs that migration wrapper before starting the API. `/health` checks the API process; `/ready` checks database/schema readiness. Use migrations for schema changes, maintain backups, and never use a destructive reset against production.

For public bot submissions, harden and dedicate the execution host. Bot containers use resource limits and restricted execution, but Docker alone is not a complete security boundary. Capacity must be measured on the actual worker, runner and database; no concurrent-user guarantee is implied.

## Offline tournaments and synchronization

Prepare the Docker images while connected to the Internet, after configuring `.env`:

```bash
npm run offline:prepare
npm run offline
```

Open **http://127.0.0.1:3000/app/**. The offline stack has its own MySQL volume and idempotent judge bootstrap. For LAN access, configure `OFFLINE_BIND` and `OFFLINE_ORIGINS` before starting it.

Use the synchronization CLI with an organizing judge's bearer token in `SYNC_TOKEN`. Use a source token for export and a destination token for planning/import:

```bash
npm run sync -- export SOURCE_API_URL TOURNAMENT_ID ./event-export
npm run sync -- plan DESTINATION_API_URL ./event-export
npm run sync -- import DESTINATION_API_URL ./event-export ./reviewed-account-map.json
```

Replace the uppercase arguments with actual values. Planning writes `mapping-review.json`; inspect it and create a separate source-account-ID to destination-account-ID JSON object for import. Review identities before importing. Imported event results preserve tournament rating snapshots without applying global Elo again. Completed daily tournaments use bundle v2; legacy bundle v1 remains supported. Existing archive limits remain 40,000 matches and the 32 MB API upload limit. Larger events require a streaming archive format.

## Maintaining game and interface identity

Keep game rules and configuration in the game subsystem, tournament orchestration in the platform/services, and rendering in the frontend game registry. Original compatibility entry points such as `logic/engine.js` remain available. Treat rule changes, protocol changes, schema migrations, and visual redesigns as explicit work rather than incidental cleanup.

The current UI retains the repository's original pixel artwork, character customization, fonts, and light/dark palettes. `frontend/preview.html` is an older standalone preview; the live application is built from `frontend/src/` and uses the API.
