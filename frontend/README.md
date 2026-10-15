# OTTv2 approved frontend with production API

React/Vite frontend. Preserve Pixeloid fonts, original sprites, team colors, and approved A layout with B accents.

This source uses real accounts, tournaments, bot validation and match recordings from the Prisma/MySQL backend. It has no built-in demo login.

Use Node.js 26. Run `npm ci`, then `npm run dev` in this folder. Locally, Vite proxies API calls to `http://127.0.0.1:3000`. For deployment, set `VITE_API_BASE_URL` before `npm run build`. Deploy the resulting `dist` directory as a static site.

Read the root `DEPLOYMENT.md` for the API, worker, database, runner and credentials setup. The previous standalone `preview.html` is a separate design reference.
