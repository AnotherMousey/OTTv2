# Render deployment

For the requested Vercel frontend + Render API setup, follow [DEPLOY_VERCEL_RENDER.md](DEPLOY_VERCEL_RENDER.md).

The old root build compiled `ottv2/`, while the server expected `frontend/dist`. The corrected root build compiles the pixel frontend. For split hosting Render uses `npm ci --omit=dev`, `npm start`, and `SERVE_FRONTEND=false`; Vercel builds `frontend/`.
