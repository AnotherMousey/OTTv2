**Overview**

This folder contains the backend logic for a 2-player Rock/Paper/Scissors-style board game. The browser interface is in the sibling `ottv2` folder.

**Files & Responsibilities**

- `main.js`: Minimal entry that loads the HTTP server. Run `node OTT_logic/main.js` to start.
- `server.js`: Implements the HTTP API and JSON request parsing. Exposes endpoints to get state, start a new game, make moves, forfeit, and a `/health` check.
- `engine.js`: `GameEngine` class with full game state, move application, battle resolution, timers, win/draw handling, and history logging.
- `utils.js`: Helper functions (square <-> index conversion, neighbor checks, battle resolution, rotate board for player perspective).
- `constants.js`: Shared constants like board size, file/rank labels, starting clock, and the `PIECE_BEATS` rule mapping.
- `../ottv2/src/`: React/Vite match screen with board, player cards, clocks, controls, and move history.

**Game Rules (summary)**

- Board: 9x9 with files `a`..`i` and ranks `1`..`9`.
- Players: `white` and `black`. Black's board is presented rotated 180° for their perspective.
- Pieces: Each player has 3 pieces — `rock`, `paper`, `scissors` — placed along the main diagonal halves at start.
- Movement: A piece moves exactly 1 square in any direction (8 neighbors allowed).
- Battles: `rock` beats `scissors`, `scissors` beats `paper`, `paper` beats `rock`.
  - If attacker and defender are same type, both are removed (`both` outcome).
  - Otherwise the winner occupies the destination square.
- Win conditions:
  - `black` wins by reaching square `a1`.
  - `white` wins by reaching square `i9`.
  - A player loses if they have zero pieces remaining.
  - Timers: each player has a 5-minute clock; if a player's clock reaches zero they lose.

**API Endpoints**

- `GET /api/game/state?view=white|black` — returns public state from requested perspective (defaults to `white`).
- `POST /api/game/new` — resets and starts a new game. Returns the initial state.
- `POST /api/game/move` — body `{ "from": "a9", "to": "b8" }`. Applies a move and returns updated state or an error.
- `POST /api/game/forfeit` — body `{ "color": "white" }`. Ends the game and awards win to the opponent.
- `GET /health` — simple health check.

**State Shape (important fields)**

- `status`: `active` or `finished`.
- `winner`: `null` or `white`/`black` when finished.
- `currentTurn`: which side must move now.
- `whiteTimeMs` / `blackTimeMs`: remaining milliseconds on each clock.
- `board`: 2D array (9x9) of either `null` or piece objects `{ id, color, type, square }` presented from the requested `view`.
- `history`: array of past moves with results.

**How to run (quick)**

1. From project root run:

```bash
node OTT_logic/main.js
```

2. Open `http://localhost:3000` in a browser. The Node server serves the frontend and API from the same origin.

3. Use the board to select a piece and then a neighboring square. The backend validates the move and returns the updated state.

If you want, I can add a small test script to exercise moves and demonstrate captures and timer expiration.