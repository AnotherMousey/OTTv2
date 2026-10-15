# OTTv2: Render + Railway deployment

This is the implementation stage after approval of the A layout with B accents. The source uses real API and MySQL data. The earlier standalone `preview.html` remains a design reference; it does not become a database client.

## Architecture and capacity

| Component | Host | Responsibility |
| --- | --- | --- |
| Frontend | Render Static Site | Approved React interface; no database secrets |
| API | Railway service (same project as MySQL) | Authentication, tournament ownership, enrollment, submissions, live/replay reads |
| Worker | Render Background Worker | Durable job claims, retries, streamed frames, authoritative result/Elo transactions |
| MySQL 8+ | Railway | Accounts, hashed sessions, tournaments, entries, bot source/versions, jobs, recordings and audit events |
| Execution runner | Dedicated Linux VM with Docker | One restricted container per bot; trusted game engine remains outside those containers |

The target is **4,000 accounts with modest simultaneous matches**, as selected. That does not require a separate service for every database entity. API, worker and runner can scale independently while using one database. This is a small service split, with a shared schema and coordinated migrations. Start with worker concurrency 2 and runner concurrency 2. Two simultaneous matches need four bot containers; each bot has a 512 MB limit and one CPU limit. Provision the runner with headroom, for example 4 vCPU and 4–8 GB RAM, then measure actual throughput.

There is no 4,000 concurrent-user or match throughput guarantee. Establish capacity through staging load tests before a public tournament. Watch queue age, runner CPU/RAM, database connections, DB latency and frame storage growth. Increase worker/runner capacity together; an overloaded runner returns 429 and jobs retry. Persistent runner unavailability eventually marks a match failed so the organizing judge can retry it.

## Copy this patch into main

1. Back up the original repository and its JSON data.
2. Copy the contents of `changed-files/` into the **root** of your original `OTTv2-main` folder, preserving all relative paths.
3. Keep files not listed in `CHANGED_FILES.txt`. No deletions are required. Do not run the old JSON server for the production frontend.
4. Commit the result to the Git repository you will connect to Render.
5. Install Node.js 26 locally. Run `npm ci`, `npm run db:generate`, then `npm --prefix frontend ci`.

New production entry points are `npm start`, `npm run worker` and `npm run runner`. The existing game engine and SDK stay in place. The API image intentionally does not install compilers or run uploaded code.

## Railway MySQL

Create a MySQL service with a persistent volume and MySQL 8 or newer. The API runs in the same Railway project and connects over the private network (`mysql.railway.internal:3306`). Enable the public TCP proxy only for clients outside Railway: the Render worker, a local worker and operator scripts.

Create a dedicated application account with SELECT, INSERT, UPDATE and DELETE permissions on the OTTv2 database. Give the separate migration account the schema permissions needed by Prisma migrations. Railway's generated credentials can bootstrap this setup; do not put the root password in frontend variables.

Use the same application account everywhere, with the host that matches where the client runs:

```text
# Railway API (private network)
mysql://APP_USER:URL_ENCODED_PASSWORD@mysql.railway.internal:3306/railway?connection_limit=5&pool_timeout=10&connect_timeout=10
# Off-Railway clients (public proxy)
mysql://APP_USER:URL_ENCODED_PASSWORD@PUBLIC_HOST:PUBLIC_PORT/railway?connection_limit=5&pool_timeout=10&connect_timeout=10
```

Set the API's `MIGRATION_DATABASE_URL` to the migration account's private URL. `railway.json` uses it only for the pre-deploy migration command (`node scripts/migrate.cjs`). Credentials containing punctuation must be URL-encoded. Keep all credentials in host environment settings or a local ignored `.env`.

Verify encryption for the external database connection in your actual Railway configuration. Where the server offers TLS, configure Prisma's MySQL TLS parameters with trusted certificates. Do not assume a TCP proxy encrypts traffic. If TLS is unavailable, use a secured tunnel or protected network path before admitting public users.

Configure backups, retention, and a tested restore procedure for the Railway volume/database. Public TCP connections can incur Railway egress charges. Keep hosts geographically close where possible.

## Isolated execution host

Do not deploy the runner as an ordinary Render web service expecting a privileged Docker socket. Use a separate Docker-capable Linux VM. The orchestration container needs the host Docker socket; it must have **no database credentials or application volume**. Bot containers never receive that socket.

On the runner host, from the repository root:

```bash
docker build -f services/runner/Bot.Dockerfile -t ottv2-bot:latest .
```

Generate a secret locally with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Put that value in an ignored `.env` file on the runner host, then start:

```bash
docker compose --env-file .env -f services/runner/compose.yaml up -d --build
```

The runner listens only at host `127.0.0.1:3667` (container port `8080`). Put an HTTPS reverse proxy in front of it. Use a real TLS certificate and preserve streaming responses. Disable buffering for `/run`, and allow a request timeout of at least `75 + maxTurns × (moveTimeLimitMs / 1000 + 0.25)` seconds for the configured maximum match duration. Restrict ingress to the worker's outbound network where possible. Set `RUNNER_URL` on Render to that HTTPS origin, and set the worker's `RUNNER_SECRET` to the exact same value.

Bot restrictions include no networking, read-only root filesystem, dropped Linux capabilities, no-new-privileges, an unprivileged UID, bounded temporary storage, CPU/memory/PID limits, compilation timeout and per-move timeout. Use gVisor (`runsc`) or a stronger isolation runtime for hostile public submissions; install it on the host and enable `DOCKER_RUNTIME: runsc` in the runner compose file. Docker alone is not a complete security boundary against kernel exploits. Harden, patch and dedicate this host before accepting untrusted uploads.

The bot image includes Python 3, Java 17 and C++ tooling plus the original SDK. Build the bot image on every new runner host before sending jobs. There is no database connection in either the runner or bot image.

## Railway API

Every API request makes several sequential database queries, so the API must run next to MySQL. On Render it reached Railway's public proxy at roughly 350 ms per query; login took about 1.8 s.

1. In the Railway project that holds MySQL, add a service from this GitHub repository. Railway reads `railway.json`: Dockerfile build, `node scripts/migrate.cjs` before each deploy, `/ready` health check.
2. Set variables: `DATABASE_URL` and `MIGRATION_DATABASE_URL` (private URLs above), `ALLOWED_ORIGINS` (the frontend origin), `NODE_ENV=production`. The service region should match the MySQL service region.
3. Under Networking, generate a public domain. Railway injects `PORT`; if asked for a target port, use the port shown in the deploy logs (`OTTv2 API listening`).
4. Check `https://YOUR_API.up.railway.app/ready` returns `ok: true`.
5. Set the frontend's `VITE_API_BASE_URL` to that domain and rebuild it.
6. After logins work through the new API, delete the old Render API service. Removing it from `render.yaml` does not delete it.

## Render services and frontend

Import the repository's `render.yaml` as a Blueprint. It defines a background worker and static frontend. The initial API/worker plan is `1c-2g`; select appropriate paid capacity after staging measurements. Review the charge before creating services. No paid service was created by this delivery.

Set variables:

| Service | Required variables |
| --- | --- |
| Worker | `DATABASE_URL`, `RUNNER_URL`, `RUNNER_SECRET`; `WORKER_CONCURRENCY=2` initially |
| Frontend | `VITE_API_BASE_URL=https://YOUR_API.up.railway.app`; Node 26 |

`ALLOWED_ORIGINS` contains exact frontend origins separated by commas, without paths or trailing slashes. Example: `https://YOUR_FRONTEND.onrender.com,https://your-domain.example`. Rebuild the frontend when changing `VITE_API_BASE_URL`, because Vite embeds it at build time. The frontend uses hash routes and needs no history-route rewrites.

The API binds to the host's `PORT`. `/health` checks the process; `/ready` checks DB connectivity. The API pre-deploy command runs `prisma migrate deploy`. Never use `prisma migrate reset` or `db push` against production.

Start the worker only after the initial migration succeeds. Its queue recovers expired 45-second leases. Active jobs heartbeat every 10 seconds. Retries use a new run ID, which resets live-view cursors; stale attempts cannot write frames or change ratings. Jobs retry up to three attempts. Match scores and Elo are committed with the job completion marker in one transaction.

## Accounts and credentials

**There is no built-in production username/password.** Set temporary API shell variables `OPERATOR_USERNAME`, `OPERATOR_NAME`, and `OPERATOR_PASSWORD` (12–128 characters), then run:

```bash
npm run db:bootstrap
```

This creates one judge account. Bootstrap never overwrites an existing account or resets its password. Remove the temporary password variable after use. The login is the username and password you selected.

For organizer-issued accounts, use authenticated `POST /api/accounts` with `{ "username": "player01", "name": "Player One", "password": "YOUR_PRIVATE_PASSWORD", "role": "player" }`. The optional `role` accepts `player` or `judge` and defaults to `player`. Bulk-create from a private JSON array:

```bash
npm run db:accounts -- /private/path/players.json
```

Each record has `username`, optional `name`, and `password`; the command creates players only, accepts up to 4,000 records, skips existing usernames, and never prints passwords. Store that input outside Git and delete it after credential distribution. There is no public signup, password reset UI, or account-management screen in this patch.

To retain accounts from the original uploaded JSON backend, explicitly run:

```bash
npm run db:import -- /private/path/account.json
```

This preserves supported scrypt hashes and maps `operator` to `judge`. It does not change existing DB users. Original tournaments, bots, human rooms and replays are **not imported automatically**. Create new tournaments in the production UI. Keep old recordings separately if needed. Known demo credentials in the original repository should be replaced before a public launch; do not import demo accounts into production merely to obtain a login.

## Product behavior

Players request entry; the organizing judge accepts or declines requests. Registration closes only after pending requests are reviewed and at least two players are accepted. Preparation requires a saved, validated bot for every accepted player. Validation checks compilation/startup and one legal initial move on the selected map; it does not guarantee the bot will behave correctly for an entire game. Changing the map or thinking limit requeues validation. The judge selects a per-move thinking limit from 0.1 to 10 seconds (default 2 seconds). It starts when the runner sends a turn state; a bot that does not return a move within that wall-clock deadline immediately loses with reason `move-timeout`. Compilation and replay animation are separate from thinking time. The limit is frozen in each match configuration and stored with its replay.

Bot versions are stored. Pairing freezes the exact submission IDs and saved configuration for that round. Pairings use current global Elo, avoid previous opponents where alternatives exist, alternate assignment by round, and allow one unrated bye for odd participant counts. This is not a full Swiss-system scoring implementation.

The judge starts queued matches and can retry failed infrastructure jobs. The trusted engine records outcomes automatically, then applies Elo K=32 exactly once. Judges cannot type arbitrary results into the browser. Players can privately run two-bot practice matches, with no Elo changes or competition-submission changes. Spectators can browse matches across tournaments without login. Practice recordings require their owner's session.

The directory and arena are paginated. Participant, pairing and rankings pages use bounded reads. Rankings are global user Elo within accepted tournament entries, not tournament points. Player-name filtering in rankings applies to the currently loaded page. Results show the current pairing page plus the latest 100 prior-round results; the arena's completed filter provides access to all recordings. Practice history shows the latest 100 account recordings.

## Local development

For a local Docker stack, put `.env` beside `compose.local.yaml`. Fill in URL-safe `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD`, `OPERATOR_PASSWORD` and a random `RUNNER_SECRET` using `.env.example` as a guide. Docker Desktop with Linux containers or a Docker-capable Linux host is required.

```bash
docker build -f services/runner/Bot.Dockerfile -t ottv2-bot:latest .
docker compose -f compose.local.yaml up -d --build
docker compose -f compose.local.yaml exec api npm run db:bootstrap
npm --prefix frontend ci
npm --prefix frontend run dev
```

Open `http://127.0.0.1:5173`. The Vite proxy forwards API requests to local port 3000. Do not reuse the development MySQL passwords in deployment. The local compose does not expose MySQL publicly; its volume retains data across restarts.

## Verification and remaining release checks

Checks completed for this delivery: Prisma schema/client generation; migration on actual MySQL **8.4.5**; 5 service unit tests; 24 existing frontend tests; a database integration scenario covering authentication, duplicate joins, ownership, phase guards, frozen uploads, validation readiness/map changes, concurrent job claims, expired leases, stale attempts, duplicate result completion, replay cursors, private practice ownership and logout; production frontend build. Seven original engine/bot regression checks also passed; the Java check was skipped because this environment has no JDK. Python and C++ executed real matches.

Browser checks used actual API/MySQL accounts and exercised player login/join/upload, judge approval/phase advancement, worker NDJSON transport, the original Python game engine, and a 33-frame recording. Desktop 1440 px and mobile 390 px, light/dark themes, bounded log scrolling and horizontal overflow were checked. The test runner used **trusted repository fixtures with a test transport**; it did not test Docker isolation or arbitrary public bots.

Before public launch: build and smoke-test all three bot languages on the actual hardened runner; test runner restart/timeouts and worker shutdown; validate Render Blueprint in your account; verify the DB connection encryption; run staged concurrent-user/runner load tests; test backups/restore; select recording/source retention; add operational alerts. None of the Render/Railway services were deployed here, and no live DB was modified.

## Official host references

- [Render Blueprint specification](https://render.com/docs/blueprint-spec)
- [Render background workers](https://render.com/docs/background-workers)
- [Render Prisma migration deployment](https://render.com/docs/deploy-prisma-orm)
- [Render pricing](https://render.com/pricing)
- [Railway MySQL and public TCP access](https://docs.railway.com/databases/mysql)
- [Prisma v6 MySQL configuration](https://www.prisma.io/docs/orm/v6/overview/databases/mysql)
- [Docker container security](https://docs.docker.com/engine/security/)

Prisma Client and CLI are pinned together at 6.19.0 for this CommonJS implementation. Treat a future major-version upgrade as a separate migration task.
