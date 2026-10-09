# OTTv2 — Pixel frontend + existing room backend

The attached pixel frontend is the visual baseline. Its CSS, sprites, board renderer, shared UI, theme logic, replay fixture/parser, fonts, and default demo screens are preserved. No old match/lobby frontend has been imported.

## Run

Requires Node.js 22.12+ (or 24+) and npm. Extract the ZIP, open a terminal in `OTTv2` (the folder with the root `package.json`), then:

```bash
npm run build
npm start
```

Open http://localhost:3000 . The root build installs frontend dependencies, builds the connected application, and regenerates the offline preview.

For development, stop the production server first, then run:

```bash
npm run dev
```

This starts the room backend on port 3000 and Vite on its printed local URL, normally http://127.0.0.1:5173 . `/api` and `/health` are proxied to the backend. Both processes stop when the launcher is interrupted. A custom `PORT` is supported for production; development proxying assumes port 3000.

Tests:

```bash
npm test
```

## Try a backend-connected recording

Keep `npm start` running. In a second terminal in the same root folder:

```bash
npm run demo:room
```

This creates two client IDs, creates/joins a room, sends two scripted legal moves, and forfeits the black seat. It prints a link such as:

```text
http://localhost:3000/?room=OTT-ABCDEF#match
```

Open the printed link. The pixel match viewer loads genuine recorded snapshots from that room, supports playback, seek, flip, inspection, import, and export, and polls for new events. Its terminal event reports the winner. This fixture drives the existing human-room API; it does not execute autonomous bots.

Any existing room can be viewed through `/?room=ROOM_CODE#match`. During development, use the same query/hash on the Vite URL. Viewing does not join a seat. Importing a JSON replay stops room polling for that viewer session; reload its room URL to reconnect. Missing rooms and network errors appear in the existing error area and retry automatically. Recorded frames remain available after temporary connection errors.

With no `room` query parameter the six original demo screens remain unchanged. There are no new visible lobby controls, manual move controls, clocks, or redesigned screens. Connected-room metadata uses the existing text slots to identify the original timed human match accurately.

## Offline preview

Open `frontend/preview.html` after extraction. It bundles JS, CSS, and all three Pixeloid fonts; no installation or internet is needed for its normal demo mode. It does not launch the server. Room links require the running connected application. The original malformed-font issue is avoided by resolving fonts relative to the compiled CSS and embedding valid data URLs. `npm run build` regenerates this file; editing source alone does not update it.

## Connected versus demo-only

| Feature | Status |
|---|---|
| Server-managed room states, captures, turns, winner, reset, forfeit, clocks | Existing backend retained; API available |
| Recording initial boards, accepted moves, timeout/forfeit terminal states | Added server recording |
| Pixel viewer loading/polling room recordings | Connected through adapter/hook |
| Replay seek, playback speed, board flip, inspection, import/export | Existing frontend retained, usable with connected recordings |
| Room create/join/move/reset/forfeit controls in the web portal | Not added; use API clients or the sample CLI |
| Bot source selection and metadata | Local frontend preview only; no compilation/upload service |
| Rankings, Elo values, tournament rounds, dashboard statistics | Original demo data |
| Authentication, bot execution, tournament scheduling, Elo calculation | Not implemented |

## Contracts and rules

See `logic/README.md` for the actual API. Room state can be rotated for Black; adapter positions come from each piece's canonical `square`, so a board is never rotated twice.

The existing engine is unchanged: white moves first, 9×9 board, one-square eight-direction moves, rock/paper/scissors captures, equal-type blocking, own-piece blocking, white target i9, black target a1, loss of all pieces of a type, and five-minute player clocks after the first move. There is no added move limit. The bot-demo's move-limit/no-time-limit rules remain a separate preview model. Connected viewer labels identify the timed room; no silent rule migration was performed.

Snapshots are captured when events occur, not fabricated by rewinding the latest state. Reset begins a new recording ID and discards the room's previous recording; export before resetting to retain it. Current rooms/recordings are in process memory, are removed by the existing six-hour room cleanup, and do not survive server restarts. Existing client-ID authorization is preserved; this is not an authenticated tournament platform.

The frontend parser supports at most 10,001 snapshots. That is a replay-import limit, not a newly enforced engine move limit. Over-limit recordings show a validation error rather than silently truncating history.

## Verification

- Production build, root startup, health endpoint, static fonts, and sample room API flow passed.
- Four original replay/theme tests and three integration/visual-contract tests passed.
- Integration checks cover all board coordinates, both array orientations, attacker/defender captures, equal-type blocking, spectator/turn rejection, recording immutability, resets, forfeit, timeout, missing room errors, and replay JSON round-tripping.
- Original and integrated static HTML was identical on all six default demo pages with the same fixture data. Evidence is in `VISUAL_COMPARISON.json`.
- Protected files/fonts are byte-identical; expected hashes and a repeatable test are included.
- Browser access to http://localhost:3000 failed with `ERR_CONNECTION_REFUSED` from the separate cloud-browser environment. Desktop/mobile screenshots, theme screenshots, font rendering in-browser, and click-through interaction checks could not be performed. HTML/hash comparisons are not substitutes for those browser checks.

See `CHANGES.md` for the complete change table and `VISUAL_BASELINE.json` for protected-file hashes.
