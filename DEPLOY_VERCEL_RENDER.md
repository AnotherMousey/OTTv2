# Deploy OTTv2: Vercel frontend + Render backend

## Why your old Render deployment failed

The root build script compiled `ottv2/dist` (the legacy UI). However, `logic/server.js` serves `frontend/dist` (the pixel UI). A successful Vite build of the wrong directory still leaves the expected directory absent. The new root build targets `frontend`, and Render runs in API-only mode, requiring no frontend build.

## 1. Commit the updated project

Extract this ZIP. Copy the CONTENTS of `OTTv2-main` over your existing local repository root (where `package.json`, `frontend/`, and `logic/` live). Do not create an extra nested `OTTv2-main` directory. Keep your existing `.git` folder. Commit and push to the branch used by both hosts:

```bash
git add .
git commit -m "Configure Vercel frontend and Render API deployment"
git push origin main
```

`ottv2/` remains a legacy folder. Neither host should build it. No visual frontend files or engine rules were changed.

## 2. Update the existing Render service

Open https://dashboard.render.com and select your existing `ottv2` Web Service. You can keep `https://ottv2.onrender.com`.

In Settings set:

| Setting | Value |
| --- | --- |
| Runtime | Node |
| Branch | `main` (or the branch you pushed) |
| Root Directory | Empty: repository root |
| Build Command | `npm ci --omit=dev` |
| Start Command | `npm start` |
| Health Check Path | `/health` |
| Auto-Deploy | On Commit |

In Environment add/update:

| Variable | Value |
| --- | --- |
| `NODE_VERSION` | `24` |
| `NODE_ENV` | `production` |
| `SERVE_FRONTEND` | `false` |
| `ALLOWED_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` initially; add your exact Vercel origin after step 3 |

Do not set `PORT`: Render supplies it. Node binds to `0.0.0.0` already.

Save and deploy the latest commit. If an old build persists, choose Manual Deploy > Clear build cache & deploy.

Open:
- https://ottv2.onrender.com/health — JSON with `ok: true`.
- https://ottv2.onrender.com/ — JSON with `service: "ottv2-api"`. This URL is the backend, not the game page.

For a NEW service, either create a Node Web Service with the same settings or create a Blueprint from the included `render.yaml`. Editing YAML alone does not reconfigure an existing manually created service: update its dashboard settings as above.

## 3. Create the Vercel frontend project

Open https://vercel.com/new, import the SAME GitHub repository, and configure:

| Setting | Value |
| --- | --- |
| Framework Preset | Vite |
| Root Directory | `frontend` |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Node.js Version | `24.x` |
| Production Branch | `main` (or your selected production branch) |

Before deploying, add this environment variable for BOTH Production and Preview:

```text
VITE_API_BASE_URL=https://ottv2.onrender.com
```

Use your actual Render origin if different. Do not append `/api`: requests already include it. This URL is public, not a secret. `frontend/vercel.json` also declares the build settings.

Click Deploy and copy the stable production origin, e.g. `https://YOUR-PROJECT.vercel.app`.

## 4. Allow that frontend on Render

Edit Render's `ALLOWED_ORIGINS` to:

```text
https://YOUR-PROJECT.vercel.app,http://localhost:5173,http://127.0.0.1:5173
```

Replace the placeholder with the actual Vercel origin. No trailing slash, path, query or hash. Comma-separated values allow multiple exact origins. Save and redeploy Render.

If you use a custom frontend domain, add its exact `https://...` origin too. Preview deployments often have different origins: add the exact preview URL when testing its API connection. The code intentionally does not allow every `*.vercel.app` site.

If you change `VITE_API_BASE_URL` later, redeploy Vercel: Vite embeds this value at build time. An environment change cannot alter already-built JavaScript.

## 5. Verify the actual API connection

Open the Vercel production site. Normal screens retain existing demo data; seeing them alone does not prove the API connection works. The attached app's existing online integration is a room replay viewer; it does not add create/join/move buttons.

In browser DevTools > Console on YOUR Vercel site, run:

```js
const backend = 'https://ottv2.onrender.com';
const response = await fetch(`${backend}/api/rooms`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ clientId: crypto.randomUUID() })
});
const result = await response.json();
if (!response.ok) throw new Error(result.error);
location.href = `/?room=${encodeURIComponent(result.roomId)}#match`;
```

The viewer should load the room's real initial recording and poll the Render replay endpoint. In DevTools > Network confirm requests go to Render, return JSON, and have no CORS errors. Use API clients or `scripts/demo-room.mjs` for gameplay; deployment does not turn demo bot/tournament screens into a bot runner.

## 6. Updates after each commit

Push to the linked production branch. Vercel builds the frontend and Render redeploys the backend automatically when configured for commit deployment. No manual upload of `dist` is needed. Vercel's frontend files are built and served on each deployment; this is not runtime fetching of GitHub source. Other branches normally create Vercel preview deployments rather than replacing production.

Render and Vercel deploy independently, so keep API changes compatible with the previous frontend while both deployments complete.

## Local development and optional combined deployment

Requires Node 24.x.

```bash
npm --prefix frontend ci
npm run dev
```

Leave `VITE_API_BASE_URL` unset locally to use Vite's `/api` proxy to localhost:3000. A copied `frontend/.env.local` pointing to Render would instead use that remote API.

To run frontend and backend together locally:

```bash
npm run build
npm start
```

Open http://localhost:3000. Combined static serving remains the default when `SERVE_FRONTEND` is unset. A combined Render deployment can use `npm run build` and `SERVE_FRONTEND=true`, but the requested split deployment uses the settings above.

## Troubleshooting and limits

- Missing frontend error: confirm Render has `SERVE_FRONTEND=false` and deployed the updated commit.
- CORS error / Origin is not allowed: match the browser's exact origin in Render `ALLOWED_ORIGINS` and redeploy.
- Requests hit Vercel `/api/...`: set `VITE_API_BASE_URL` in the relevant Vercel environment and redeploy.
- Non-JSON response: check backend URL, health endpoint and startup. A free Render instance can take about a minute to wake after 15 minutes idle.
- Rooms disappear: rooms and recordings are stored in backend process memory. Any Render restart, redeploy or idle shutdown loses them. Export recordings before restart; persistent storage is a separate future change. Use one instance; multiple independent instances would have different room maps.
- Your old `>=20` engine range allowed Render to choose Node 26. The project now uses Node 24.x; dashboard `NODE_VERSION` takes precedence over repository files.
- The vulnerability message in the supplied log came from installing the legacy `ottv2` frontend. That folder is no longer installed by either deployment. This is not a claim that the whole repository has been security-audited.

## Official references

- https://vercel.com/docs/frameworks/frontend/vite
- https://vercel.com/docs/git
- https://vercel.com/docs/environment-variables
- https://vite.dev/guide/env-and-mode
- https://render.com/docs/web-services
- https://render.com/docs/node-version
- https://render.com/docs/free
