# Production deployment update

The Render + Railway implementation replaces the JSON backend for production. Read [DEPLOYMENT.md](DEPLOYMENT.md). Use `npm start` for the Prisma/MySQL API and `npm run worker` for the durable worker. Bot execution needs the dedicated Docker runner described in that guide. There is no built-in production password.

The approved frontend is connected to server data. Original fonts, artwork and engine rules remain. The older instructions below describe the original JSON implementation and are retained for reference.

---

# OTTv2 — Approved frontend v5 integrated with the backend

This project integrates the approved pixel frontend with the existing room server and Java/C++/Python graders. Game rendering is selected through a frontend game registry; OTTv2 engine, rules, coordinate utilities and configuration live under `logic/games/ottv2`. Compatibility imports at `logic/engine.js`, `utils.js` and `constants.js` remain available.

## Preview without installation

Open `frontend/preview.html`, navigate to Replay, and choose **Finished sample matches…**. All nine samples end through the authoritative engine. The same samples are JSON files under `samples/matches` for Import replay. Offline submission displays a message requiring the backend; it does not fabricate bot results.

## Run the integrated application

Requires Node 24.x. Bot matches additionally require Python 3, g++ with C++20 support, and Java JDK 17+ (including `javac`).

```bash
npm ci
npm run build
npm start
```

Open http://localhost:3000/#submit . Select a map, turn limit, first side and the language for each player; run the included bot examples. Language changes replace untouched example code with the matching language example; edited source is retained.

```bash
npm run dev
```

Development starts the backend on 3000 and Vite on its printed URL. Root build also regenerates embedded samples and the offline preview. Frontend code remains independent of server code at build time; Vercel uses the committed generated sample JSON.

## Game configuration

- Default legacy room: 9×9, original 9 pieces per side, White first, 5-minute clocks, no turn limit, all-piece elimination.
- Bot default: same engine setup, 31-turn limit; more remaining pieces wins, equal counts draw.
- Custom maps: 5–26 rows/columns, explicit initial pieces, targets, first side, clock budget, elimination mode and turn limit.
- `elimination: "one-type"` enables loss after one piece type is completely eliminated; `"all-pieces"` retains actual engine behavior in the attached repository.
- Same-type captures remain blocked. Bot invalid actions consume a turn, as in the existing grader; invalid human-room moves are rejected without consuming a turn.
- Goal/elimination takes precedence when achieved on the final permitted turn. `limitPolicy: "draw"` restores the old grader's unconditional draw at the limit if required.

## Samples and tests

See `samples/README.md` for map sizes, terminal match results and reproduction instructions.

```bash
npm run samples
npm test
```

Tests cover runtime preflight, server-history ownership association, complete replay persistence across process restarts, existing rooms, captures, blocking, authorization, reset, clocks/forfeit, CORS, metadata, cursor replay, all sample transitions, configurable boards and real bot runner execution. Language tests explicitly skip when the required compiler/runtime is unavailable; check the reported skip count.

## API and protocol

Existing endpoints and input fields are retained. Room and bot creation accept optional `gameId`, `mapId` and `config`. New `/api/games/current` and `/api/games/ottv2/spec` endpoints expose capabilities and maps. Logs now carry protocol version 2 metadata, renderer version, exact judge configuration and terminal result. Old replay imports and old non-cursor API consumers remain supported.

See `docs/PROTOCOL.md`, `docs/INTEGRATION_CHANGES.md` and `logic/README.md`.

## Deploy

Frontend: Vercel, Root Directory `frontend`, Vite, `npm ci`, `npm run build`, output `dist`, Node 24.x, `VITE_API_BASE_URL` set to the actual backend origin.

Backend: Render Docker service using the included `Dockerfile` and `render.yaml`, with `ALLOWED_ORIGINS` set to the exact frontend origin. Docker includes Java/Python/C++ toolchains. Full steps: `DEPLOY_VERCEL_RENDER.md`.

## Accounts and tournaments

The backend supports operator-provisioned accounts and multi-round tournaments. Bootstrap the operator with `OPERATOR_USERNAME` and `OPERATOR_PASSWORD`; use the bearer token returned by `/api/auth/login` for account, registration, code upload, and round-management APIs. Account records live in the private `DATA_DIR/account.json`, and each tournament has its own ignored JSON file under `DATA_DIR/tournaments`.

## Preserved scope and limits

Navigation, theme, pixel assets, replay controls, import/export and the room/bot workflows remain. The existing frontend demo rankings remain separate from backend tournament standings. Tournament pairings use weighted random ordering plus current points and coefficients; the backend does not eliminate players between rounds.

Rooms, submissions, queue and recordings are still in process memory and are lost on restart. The worker bound limits concurrent graders; it is not a distributed queue or a 4,000-user load-test result. Bot source still executes directly in server processes, as in the original project: use trusted submissions until isolated workers are implemented. Docker supplies dependencies; it does not provide per-bot isolation.

## Latest frontend integration

The accepted v5 frontend is now the live application in `frontend/`. It retains the original rectangular gold flag, subdued dark-mode pole and YOU badge, and smooth 720 ms piece movement at 1× with capture fading. Submission-linked replays hide the sample selector and import control. My Submissions loads real server history, polls status, and opens the corresponding real replay. The offline `frontend/preview.html` remains a demonstration only.

Server source, match metadata, terminal replays, account records and tournament records are atomically stored under `DATA_DIR` (default `./data`). Keep that directory private and outside source control. A stable browser client ID still associates legacy submission history with the browser. Live rooms remain in memory. Run one backend process with this file adapter; use a database adapter before horizontal scaling.

See [DEPLOY_VERCEL_RENDER.md](DEPLOY_VERCEL_RENDER.md) for exact deployment settings, persistence requirements and CLI deployment when a teammate owns the repository. `frontend/` replaces the old `/ottv2` build folder; do not keep using the old Render frontend build command. With `SERVE_FRONTEND=false`, Render serves the API without requiring a frontend build.

## Reusable tournament refactor and offline operation

See [architecture audit and operating guide](docs/REFACTOR_AUDIT_VI.md) and
[verification record](docs/VERIFICATION_REFACTOR.md). Prepare images while online
with `npm run offline:prepare`; use `npm run offline` after disconnecting. The
unchanged frontend is served at `http://127.0.0.1:3000/app/`. Sync completed events
through `npm run sync`, with an explicitly reviewed account mapping. Imports
preserve tournament-specific rating snapshots and never apply global Elo again.
