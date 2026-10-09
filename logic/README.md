# Existing room backend with event recording

Run from the project root with `npm start`. `main.js` starts the existing HTTP server on port 3000 (`PORT` overrides it). The server serves `../frontend/dist`.

| Method | Endpoint | Request / result |
|---|---|---|
| POST | `/api/rooms` | JSON `{clientId}`; creates room with caller as white |
| POST | `/api/rooms/:id/join` | JSON `{clientId}`; existing role or available seat; otherwise spectator |
| GET | `/api/rooms/:id/state?clientId=ID` | `{roomId,role,seats,state}`; client ID optional for spectator |
| GET | `/api/rooms/:id` | Alias for state |
| POST | `/api/rooms/:id/move` | JSON `{clientId,from,to}`; authoritative validation and state result |
| POST | `/api/rooms/:id/new` | JSON `{clientId}`; player-only reset and new recording ID |
| POST | `/api/rooms/:id/forfeit` | JSON `{clientId}`; player-only forfeit |
| GET | `/api/rooms/:id/replay` | Added: `{roomId,matchId,frames}` with canonical snapshots |
| GET | `/health` | Existing health/room-count endpoint |

Original success/error response methods and statuses are retained. Errors are JSON `{error}`. Client IDs are identifiers, not real login credentials.

`recording.js` stores snapshots of canonical board state and clocks at initialization, accepted moves, and terminal events. Each frame has `{state,event,move,moveNumber}`. States omit repeated full move-history arrays to avoid quadratic recording size; each event carries its own move. Reads synchronize the existing engine timer and record timeout once. Recordings use white/canonical orientation; frontend adapters can also consume rotated states using piece.square.

The engine, constants, utils and server entry point are unchanged. Same-type pieces block (they are not removed). Losing all pieces of one type loses the match. Targets: white i9, black a1. Five-minute player clocks begin after White's first move. No new game move limit was introduced.

Room cleanup and in-memory lifecycle are unchanged. Reset starts a fresh recording; restart loses rooms. This backend does not run Java/Python/C bots or implement scheduling, Elo, authentication or tournament persistence.
