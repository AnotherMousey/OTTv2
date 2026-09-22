# Deploy OTTv2 to Render

This project is configured as one Render Web Service.

## 1. Push to GitHub

```bash
git add .
git commit -m "deploy multiplayer rooms on Render"
git push origin main
```

## 2. Create the Render service

### Recommended: Blueprint

1. Go to https://dashboard.render.com
2. Click **New > Blueprint**.
3. Connect the GitHub repository that contains this project.
4. Render will detect the root `render.yaml`.
5. Apply the Blueprint.
6. Wait until build/deploy finishes.
7. Open your `https://<service-name>.onrender.com` URL.

The included `render.yaml` uses:

- Runtime: Node
- Build: `npm run build`
- Start: `npm start`
- Health: `/health`
- Plan: Free

### Manual Web Service alternative

Create **New > Web Service** and set:

- Root Directory: leave empty (repository root)
- Runtime: Node
- Build Command: `npm run build`
- Start Command: `npm start`
- Health Check Path: `/health`
- Instance Type: Free (for a class demo)

## 3. Test online

Open the Render URL and click **Create online room**.

Example:

```text
https://your-service.onrender.com/?room=OTT-ABC123
```

Send that full URL to another person.

- First browser/client: White
- Second browser/client: Black
- Third and later: Spectator

Different room codes run different GameEngine instances.

## 4. Important limits of this simple deployment

Room data is held in Node process memory only.

This means:

- a restart/redeploy removes active rooms
- it is designed for one Render instance
- it is suitable for demos/classes, not durable production state

For production persistence/scaling, move room state to Redis/Postgres and use WebSockets or Socket.IO for realtime server push.
