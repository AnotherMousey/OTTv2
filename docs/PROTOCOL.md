# Protocol v2 and game-package boundaries

## Versions

`protocolVersion: 2` versions the shared transport envelope. `gameId: "ottv2"` selects the judge/frontend package. `rulesVersion: "ottv2-configurable-v2"` identifies the engine implementation; `config` stores the exact per-match rules and map. `rendererVersion: "1"` selects a compatible renderer. `schemaVersion: 1` identifies the normalized render-replay format retained for existing import/export controls.

The backend returns canonical snapshot logs. The OTTv2 adapter converts these into the established render schema; the portal never computes captures or a winner. Historical logs without metadata use the legacy adapter; absent limits remain `null` (unknown/unlimited) rather than inferred from recorded frame count. Existing normalized schema-v1 OTTv2 and Grid Demo files are still importable.

## Discovery and creation

`GET /api/games/current` (also `/api/games/ottv2/spec`) returns board bounds, piece types, languages, configured maps and default bot config. Rankings/tournaments endpoints are not fabricated; those pages retain demo content.

Existing `POST /api/rooms {clientId}` and `POST /api/matches {whiteSubmissionId,blackSubmissionId}` remain valid. Optional new fields:

```json
{
  "gameId": "ottv2",
  "mapId": "large-13",
  "config": {
    "maxTurns": 100,
    "firstSide": "black",
    "limitPolicy": "more-pieces",
    "elimination": "all-pieces"
  }
}
```

Inline `config.initialPieces` and `boardSize` support custom maps. Config is validated before enqueueing. `maxTurns:null` is valid only for human rooms. Targets are squares a1–z26 within the selected board, and each piece has a unique square/id. One-type elimination requires both sides to start with all three types.

## Snapshot log

Each log includes matchId, optional roomId, versions, board `{kind,width,height,goals,sources}`, firstSide, mapName, exact config, maxMoves (turn limit), clock budget, teams, frames and result.

Each frame includes `state`, human-readable `event`, optional `move`, and `moveNumber` counting consumed turns. State carries canonical piece squares even when the board array is rotated for Black. The adapter uses squares, preventing double rotation. Normalized viewer frames have `pieces:[{id,side,type,x,y}]`, status, winner, endReason, clocks and event. Their extra terminal snapshot is an event, not an additional turn.

`result` has status, winner (white/black/null), reason, turns and remaining piece counts. At the configured turn limit, more pieces wins and equal counts draw. Goals and elimination on the last turn take priority. `limitPolicy:"draw"` selects legacy limit resolution. Bot invalid actions consume a turn; room invalid actions do not. Bot errors forfeit; player clocks still apply.

## Incremental recording

Full replay GET routes retain their original response behavior without query parameters. Optional:

```text
GET /api/rooms/:id/replay?afterSeq=-1&limit=200&recordingId=...
GET /api/matches/:id/replay?afterSeq=-1&limit=200
```

`afterSeq` is exclusive. Response frames have contiguous `seq`; metadata includes nextSeq, totalFrames and hasMore. `limit` is 1–500. A mismatched recordingId after a room reset returns `reset:true` and frames starting at zero. Frontend merges these frames and falls back to full logs from old servers. Room polling stays active to observe resets; bot polling stops when a finished replay or failure arrives.

## Bot SDK wire compatibility

The established line protocol remains `color|currentTurn|turnNumber|piece...`. A new trailing `@boardSize=N` field provides dynamic dimensions. Existing SDK parsers ignore this non-piece field. Updated Python/C++ states expose board_size; Java exposes board().size(). Multi-digit ranks use square.substring(1) / square[1:] rather than one-character rank parsing. Old 9×9 bots continue to run; bots with hardcoded bounds must be updated to play larger maps.

## Adding a future game

Add a backend game package exposing create/reset, canonical snapshot, action validation/application, result, turn handling and bot-state encoding, and register its factory/specification. Add the frontend package's renderer, validator, inspector/stat definitions, assets, documentation and examples; register gameId/rendererVersion. Preserve old packages for old replays.

This implementation registers an OTTv2 judge and two frontend renderers. It does not claim arbitrary new games need no new game-specific code. The portal is separated from rendering; the current runner/SDK and player model still target two-player board games. Changing player count or bot execution contract needs an explicit protocol extension, not an undocumented silent substitution.

## Runtime discovery and submission history

GET `/api/runtime` returns `{languages:{python:{available,message},java:{available,message},cpp:{available,message}}}`. Unavailable requested runtimes make POST `/api/matches` return HTTP 503 with `{error,code:"RUNTIME_UNAVAILABLE"}` before queueing.

POST `/api/submissions` and `/api/matches` accept an optional `clientId` string for history association. When provided on match creation, both submissions must have that same clientId. GET `/api/submission-history?clientId=...` returns `{records:[...]}` in descending creation order. Each record includes public match metadata, matchId, language pair, mapName, status, result and replay frame count; it excludes bot source. This client ID is not authenticated account identity. Existing ID-based read endpoints remain unchanged.

Stored queued/running matches become failed after restart, with an interruption message. Finished match replays load unchanged. Live rooms remain volatile. File persistence assumes a single backend process and a durable DATA_DIR.
