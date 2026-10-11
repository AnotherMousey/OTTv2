# OTTv2 backend

The backend supports two execution models:

* The original human room API remains available under `/api/rooms`.
* Autonomous Java matches use `/api/submissions` and `/api/matches`. A match
  compiles one local JVM process per player, alternates turns, validates every
  move with the authoritative JavaScript engine, and exposes the immutable
  event log through `/api/matches/:id/replay`.
  `display.js` is the display adapter: it turns that log into validated canonical
  snapshots for the web replay view; it never executes player code.

## Java player contract

The web submission is a single `RobotPlayer.java` source file defining the
Battlecode-style entry point:

```java
import ottv2.sdk.RobotController;

public final class RobotPlayer {
  public static void run(RobotController rc) throws Exception {
    while (true) {
      // sense, call rc.move(from, to), then end the turn
      rc.yieldTurn();
    }
  }
}
```

The SDK provides an object-oriented `RobotController`, `GameState`, `Board`,
`Piece`, and `Move` in
`logic/sdk/java/ottv2/sdk`. The controller exposes sensing, `hasMoves`,
`canMove`, `move`, and `yieldTurn`, following Battlecode's per-turn player
loop. `GameState` owns an immutable `Board`, and `Board` owns the immutable
piece collection. The grader remains authoritative; an illegal move forfeits
that turn.

The temporary runner requires a JDK (`java` and `javac`), `g++`, and Python 3
on the server. It has a per-turn timeout
and a maximum turn count, but it is **not a security sandbox**: submitted Java
can access the server's files and resources. Use only on a trusted local
development server until process isolation is added. Matches are currently
held in memory and are lost on restart.

An illegal move is recorded in the log and forfeits that player's turn; the
opponent moves next. Compilation failures, process crashes, malformed output,
and response timeouts still end the match with the other player as winner.

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

Room cleanup and in-memory lifecycle are unchanged. Reset starts a fresh recording; restart loses rooms. This backend does not implement scheduling, Elo, authentication or tournament persistence.
