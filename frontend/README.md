# OTTv2 — Pixel Bot Arena

Frontend-only React/Vite prototype for evaluating the design. No backend is required.

## Quickest preview

Extract the ZIP and open **preview.html** in Chrome, Edge, or Firefox. This file includes the built application, styles, and fonts. It does not require a server or Internet connection. If your browser restricts local-file features, use the development server below.

## Editable project

Requires Node.js 22.12+ (or 24+) and npm.

```bash
npm ci
npm run dev
```

Open the local URL shown by Vite. Navigate to **Match viewer** for the simulation screen.

```bash
npm run build
npm run preview
npm test
```

The included `dist/` directory is the production build; serve it with any static web server. Hash routes need no server-side route rewrites. Rebuild after editing source. The single-file preview is a snapshot of this delivery and does not update automatically.

## Included interactions

- Responsive overview and navigation, six screens, animated page entry and button feedback.
- Bot source selection for Java/Python/C, extension/size validation, local metadata persistence, and feedback. Source files are never uploaded or executed.
- Ranking search, language filtering, and sorting.
- Tournament round selection using sample pairings.
- Match playback, seek, previous/next/first/last frame, speed, flip board, piece inspection, move log, per-frame output, JSON import/export.
- Rules, integration notes, and a replay protocol example.
- Reduced-motion support, keyboard focus indicators, labels, and responsive board controls.

## Design and game rules

All typography uses the bundled Pixeloid fonts, with bold glyphs and larger metadata for reading comfort. The header includes a pixel sun/moon toggle for light and dark mode. The initial theme uses your saved choice, then your system preference; explicit choices are remembered in local storage. The toggle still works when browser storage is blocked. Artwork and pieces are code-native pixel SVGs. Hammer is the visual skin for the existing **rock** type; replay records continue to use `rock`. Rock/hammer beats scissors, scissors beat paper, paper beats rock/hammer. Same-type captures are blocked. Pieces move one square in eight directions. Board: 9×9. White target: i9; black target: a1. The judge configures the map, first side, and move limit. There is no execution-time clock.

The Battlecode reference informs board emphasis, team statistics, and playback controls. The Ronas IT reference informs white space, pixel artwork, bold type, thin borders, square buttons, and motion. The illustrated landscape is an implementation interpretation, not a screenshot of the image concept.

## Integration boundaries

Everything marked preview/demo is sample data. No authentication, bot compiler, bot execution, judge, distributed room host, pairing service, or Elo calculation is implemented. Weekly cutoff has no assumed weekday. The frontend targets a 4,000-student tournament but does not demonstrate server scalability.

Suggested boundaries are documented in Rules & SDK. Replace sample standings and brackets with your API responses; replace local submission metadata with your upload API; fetch judge replay snapshots for Match viewer. The replay schema here is a proposed frontend adapter, not an existing backend contract.

- `src/main.jsx`: portal shell, navigation, local state.
- `src/pages.jsx`: overview, submissions, standings, bracket, rules, and viewer.
- `src/Board.jsx`: OTTv2 board renderer. A new annual game can supply a different renderer.
- `src/Pixel.jsx`: original piece and decoration sprites.
- `src/ui.jsx`: shared buttons and artwork components.
- `src/replay.js`: demo fixture and replay-format validation. Fixture generation is only for preview and is not a production judge.
- `src/style.css`: visual tokens, motion, desktop and mobile layouts.

Replay imports accept up to 5 MB. Coordinates are zero-based: x=0 is column a; y=0 is row 9. Export the demo for a full example. Optional `bots.white`/`bots.black` contain language/version metadata; optional frame `output` supplies display-only bot output. Schema validation rejects invalid types, out-of-board coordinates, overlapping pieces, duplicate IDs, and invalid frame counts. The production judge must verify moves, winners, results, and rules versions.

## Verification

Production build passed. Theme preference and blocked-storage tests passed. Replay tests passed for legal single-square moves, RPS captures, structural validation, and overlapping-piece rejection. All six page components passed server-render smoke checks. Cloud-browser access to the local Vite server was unavailable, so actual visual checks and browser interaction tests were not completed.

For review: open preview.html, navigate through all tabs, resize to mobile, use replay controls, export/reimport a replay, filter standings, and select/save a bot file.

## Credits

- Visual reference: https://dribbble.com/shots/22652560-Game-Shop-Landing-Page
- Font listing: https://www.1001fonts.com/pixel-fonts.html?page=2
- Pixeloid by GGBotNet, SIL Open Font License 1.1. Bundled license: `public/fonts/License.txt`.
- All pixel icons/landscape elements are original code-generated artwork.

## Combined-project integration

This folder is now served by the sibling Node room backend. Its default demo and visual source are preserved. For combined run commands, backend-connected room URLs, supported services, and verification limits, read the root `../README.md` and `../CHANGES.md`. The original demo notes above describe the preview model, not the legacy backend's timed room rules. Rebuilding through the root `npm run build` also regenerates the standalone preview.
