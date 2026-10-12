# Integration verification

- Node 24 production frontend build and standalone offline preview build passed.
- 27 automated tests passed; zero failed/skipped. Real Python, C++ and Java SDK matches finished on the 13×13 board. Java used the installed JDK compiler module through an OTTV2_JAVAC wrapper because this test host lacks a javac launcher. Docker installs the normal javac launcher.
- Existing room tests passed: create/join/spectator restrictions, moves, captures, same-type blocking, reset, timeout, forfeit, full/cursor replay, configured boards and CORS.
- All 9 engine-generated samples reached their recorded terminal outcomes, including goals, turn-limit piece-count wins/draws and elimination.
- Separate server-process tests retained server history and the identical complete replay across restart; a missing Python executable returned 503 before queueing, with no false winner.
- Chromium checks passed: live 5×5 Python submission, server history after removing the local history cache, submitted replay hides samples/import, 13×13 and 5×5 sample rendering, actual intermediate CSS movement position at 1×, approved rectangular gold flags in dark mode, 390px mobile layout and offline preview history.
- Original fonts and non-flag piece/interface sprite definitions retain their original hashes.

Docker is unavailable on the test host, so the Docker image itself was not built here. Hosted Render/Vercel deployments were not performed. File persistence needs durable storage on the host and a single backend process; live room state remains in memory.
