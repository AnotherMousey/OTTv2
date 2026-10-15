# Vercel frontend + Render backend

1. Copy the contents of the extracted project folder into the existing Git repository root, retaining `.git`. Commit and push to your linked branch. Do not nest another project folder inside the repository.

2. Render: create a Web Service from the repository using **Language: Docker**, root directory empty, Dockerfile `./Dockerfile`, health check `/health`, auto-deploy On Commit. Keep the default Docker start command (`node logic/main.js`). The image installs Node 26, Python 3, Java JDK 17 and g++. This is needed for actual bot matches, not just the Node API.

   Environment:

   ```env
   SERVE_FRONTEND=false
   NODE_ENV=production
   MATCH_WORKERS=1
   DATA_DIR=/var/data/ottv2
   ALLOWED_ORIGINS=https://YOUR-PROJECT.vercel.app
   ```

   Render supplies `PORT`. The image uses `OTTV2_PYTHON=python3`.

   The included `render.yaml` supports creating a Docker service through a Blueprint. Merely committing it does not convert your existing manually configured Node service. If you create a new Docker service, it may have a new URL; use that actual URL in Vercel. Do not delete the old service until the new deployment is verified.

   **Retaining submission history:** use a paid Render web service and attach a persistent disk at `/var/data`. Keep `DATA_DIR=/var/data/ottv2`. Only files on that disk survive replacement of the deployment. The free Blueprint is suitable for a temporary demo: it cannot attach a persistent disk and its history will be lost when the instance is replaced. The storage adapter in this version is file based; it does not connect to Postgres. Use one backend process/instance for this adapter.

3. Vercel: import the same repository. If Vercel cannot import your teammate’s repository, deploy your local checkout using the CLI: from `frontend`, run `npx vercel`, link/create a project in your account, configure `VITE_API_BASE_URL` in its dashboard, then run `npx vercel --prod`. This does not require importing the repository in Vercel; future updates use the CLI too. Configure Vite, Root Directory `frontend`, install `npm ci`, build `npm run build`, output `dist`, Node 26.x.

   Set for Production and Preview:

   ```env
   VITE_API_BASE_URL=https://YOUR-ACTUAL-BACKEND.onrender.com
   ```

   No `/api` suffix. Redeploy after environment changes.

4. Add the exact stable Vercel origin to Render `ALLOWED_ORIGINS`, no trailing slash. Separate multiple origins with commas. Redeploy Render. Add exact preview/custom-domain origins when used.

5. Verify `/health`, `/api/games/current`, `/api/runtime`, then submit two bots from the Vercel frontend. Select a 5×5 map and 2 turns for a fast check. The UI must navigate to a real match ID, load the replay and show its final result. Loading a sample alone does not verify the live API connection.

6. Push changes to the linked production branch to trigger builds. Map/sample source edits require `npm run samples` and committing generated `frontend/src/games/maps.json` and `samples.json`; Vercel builds frontend only. Render and Vercel deploy independently; protocol v2 remains compatible with old full-log clients during deployment.

For a Node-only backend environment with toolchains already installed, `npm ci --omit=dev` and `npm start` still work. If those toolchains are missing, health/rooms may work while bot compilation fails. Docker is the provided deployment path for retaining all three languages.

Submissions, submitted-match results and complete replays are saved under `DATA_DIR`. Restarting with the same directory retains history. Queued/running matches interrupted by a restart are marked failed; they are not awarded a winner. Live rooms remain in memory, as before. History uses a stable browser client ID, not authenticated user accounts: keep browser site data to retain access to “My Submissions.” This ID is an association mechanism, not an authorization boundary. Existing ID-based replay endpoints retain their original behavior.

Docker installs the compiler/interpreter toolchains for running submitted code. It does not isolate each bot from other bots or the server. This deployment retains the original trusted-submission execution model.

Missing runtime: `/api/runtime` reports available languages. Match creation returns HTTP 503 `RUNTIME_UNAVAILABLE` before queueing when a requested executable is absent. Python selects `python3`, then `python`; an explicit `OTTV2_PYTHON` override must point to a working executable. Optional overrides also exist for `OTTV2_JAVA`, `OTTV2_JAVAC`, and `OTTV2_CXX`.

Official references:
- https://render.com/docs/docker
- https://render.com/docs/web-services
- https://vercel.com/docs/frameworks/frontend/vite

- https://render.com/docs/disks
- https://render.com/docs/free
- https://vercel.com/docs/projects/deploy-from-cli
