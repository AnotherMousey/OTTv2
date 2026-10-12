# Current integration changes

- Approved frontend v5 replaces the earlier frontend; original piece sprites and fonts remain. Flag is the approved gold rectangle. Movement/capture animation retains stable DOM ordering.
- My Submissions loads server match history using a stable browser client ID. Offline preview entries stay confined to offline mode. Submitted replays hide sample selection/import.
- Python resolves python3 before python. Runtime checks reject unavailable toolchains before queueing, rather than recording a bot loss. Existing bot-error forfeits still represent an actually started bot failing.
- Sources, submitted-match metadata and full replays use atomic per-record JSON files. Interrupted active matches become failed on server restart. Live rooms retain the previous in-memory behavior.
- Existing API payloads without clientId remain supported; newly integrated frontend requests include it for history association. This adds no login/authentication. Sources never appear in history responses.
- New endpoints: GET /api/runtime; GET /api/submission-history?clientId=... . Existing room/match/replay routes remain.
- Render Docker keeps Python, JDK and C++ toolchains; Vercel builds frontend only. Persistent Render history requires a disk and DATA_DIR beneath its mount.
