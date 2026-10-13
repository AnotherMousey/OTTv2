# Merge validation

- Production build passes on Node 24.
- Backend: 15 tests passed; 1 skipped because Java/JDK is unavailable.
- Frontend: 16 tests passed.
- Live API test covers CORS, login, accounts, self-join, upload ownership, judge-only rounds,
  scores, byes, idempotent scoring, logout and restart persistence.
- Visual asset hashes match the desired frontend.
- Browser interactions were not verified: no browser executable is installed.
- Python and C++ match tests pass. Java execution was not verified: no JDK is installed.
