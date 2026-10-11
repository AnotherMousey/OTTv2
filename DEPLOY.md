# Deploy OTTv2

## Local or single-server deployment

Requirements:

- Node.js 24.x
- Java JDK 21+
- Python 3
- g++ with C++20 support (only needed for C++ submissions)

Install dependencies and build:

```powershell
npm.cmd ci
npm.cmd run build
```

Start:

```powershell
$env:SERVE_FRONTEND="true"
$env:ALLOWED_ORIGINS="http://localhost:3000"
npm.cmd start
```

Open `http://localhost:3000/#submit`, choose one language, paste one bot for
White and one for Black, then submit. Both programs use the same line protocol;
the JavaScript authoritative engine validates every move and writes one replay
log. Open the resulting `?match=MATCH-ID#match` URL to display it.

## Production warning

The current runners execute submitted Java, C++, and Python directly on the
server. This is suitable only for a trusted development machine. Before
exposing submission endpoints publicly, run each player in a sandboxed worker
with resource, filesystem, network, process, and syscall restrictions.

## Deployment split

For a hosted deployment, build `frontend/` with Vite and deploy its `dist/`
directory to a static host. Run `logic/main.js` on a worker/server with the
three language toolchains installed, set `SERVE_FRONTEND=false`, and configure
`ALLOWED_ORIGINS` to the exact frontend origin. The frontend must proxy or
target `/api` at that backend.
