# OTTv2 backend

Start via `npm start` from the root. `logic/main.js` binds `0.0.0.0` on Render's `PORT` or 3000. `SERVE_FRONTEND=false` serves JSON API only; otherwise it serves `frontend/dist` for a combined local app.

## Retained APIs

- `POST /api/rooms {clientId}` — create White seat.
- `POST /api/rooms/:id/join {clientId}` — fill Black seat or return existing role/spectator.
- `GET /api/rooms/:id/state?clientId=...` — perspective state.
- `GET /api/rooms/:id/replay` — canonical full recording.
- `POST /api/rooms/:id/move {clientId,from,to}` — validate ownership/turn/movement/capture.
- `POST /api/rooms/:id/new {clientId}` — reset same game configuration and recording ID.
- `POST /api/rooms/:id/forfeit {clientId}` — forfeit active game.
- `POST /api/submissions {playerId,source,language}` — Java/C++/Python source.
- `POST /api/matches {whiteSubmissionId,blackSubmissionId}` — enqueue real bot match.
- `GET /api/matches/:id` — status/config/result.
- `GET /api/matches/:id/replay` — 202 until recorded log is available; 409 on job failure.
- `GET /health` — process health and room count.

## Accounts and tournaments

Set `OPERATOR_USERNAME` and `OPERATOR_PASSWORD` on the first deployment to bootstrap the operator account. Accounts are stored in `DATA_DIR/account.json` as valid JSON grouped by `MM/DD/YYYY` creation date, and passwords are stored as scrypt hashes. The file is private and should be protected in deployment.

- `POST /api/auth/login {username,password}` — obtain a 24-hour bearer token.
- `POST /api/accounts {username,password}` — operator-only account creation.
- `POST /api/tournaments {id,name,rounds,coefficient}` — operator-only tournament creation.
- `POST /api/tournaments/:id/register {username,coefficient}` — operator-only registration.
- `POST /api/tournaments/:id/code {source,language}` — submit or replace the authenticated player's code before the next round.
- `POST /api/tournaments/:id/next-round` — operator-only weighted random pairing and match start.
- `GET /api/tournaments/:id` — tournament standings, pairings, rounds, and match states.

Each tournament is stored as `DATA_DIR/tournaments/<id>.json`; it contains registered players, coefficients, standings, round count, pairings, and submission references. There are no elimination rounds: every configured round is played, and each next round may use the player's latest code.

Room/match creation also accepts `gameId`, `mapId` and `config`. `GET /api/games/current` and `/api/games/ottv2/spec` expose capabilities and the three configured sample maps. Optional replay pagination is documented in `docs/PROTOCOL.md`.

## Game library

`games/ottv2/` contains engine, config, coordinate helpers and constants. Existing root `engine.js`, `utils.js`, `constants.js` exports remain compatible. The judge records authoritative snapshots, not client-produced results.

Default rooms preserve the attached engine's original setup and all-piece elimination. Bot limits now decide by remaining piece count as requested; `limitPolicy:"draw"` opts into the old draw behavior. Optional one-type elimination, dynamic board sizes and target squares are explicit judge configuration.

## Runners

Java SDK under `sdk/java/ottv2/sdk`, C++ under `sdk/cpp`, Python under `sdk/python`. Standard commands are javac/java, g++, and python; override with OTTV2_JAVAC, OTTV2_JAVA, OTTV2_CXX, OTTV2_PYTHON. Docker sets Python to python3. MAX response deadline remains 2 seconds and compilation deadline 15 seconds.

SDK states include board size while keeping the old packed line format. Grader concurrency is bounded by MATCH_WORKERS (default 2; Docker/Render 1). This is an in-memory queue, and all rooms/submissions/recordings are lost on restart. Bot execution retains the original trusted-server scope; Docker is not per-bot isolation.
