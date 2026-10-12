# OTTv2 frontend

This is the approved v5 frontend integrated with the backend. See the root README and DEPLOY_VERCEL_RENDER.md.

Run `npm ci` and `npm run build` here for Vercel. Set `VITE_API_BASE_URL` to the backend origin. `preview.html` is a standalone offline demonstration, generated using `npm run build:preview`. The live application calls room, submission, match, history and replay APIs.
