# Deployment Guide

ModelWise is a split full-stack app: a Vite SPA frontend and a FastAPI backend. The recommended managed deployment is Vercel for the frontend and Railway for the backend.

## Vercel + Railway

### 1. Deploy Backend To Railway

Create a Railway service from the repository and point it at the `backend` directory.

Use these settings:

```text
Root directory: backend
Build: Dockerfile or Railway default Docker build
Start: handled by backend/Dockerfile
```

Set Railway environment variables:

```env
ENVIRONMENT=production
ENABLE_API_DOCS=false
CORS_ORIGINS=https://your-vercel-app.vercel.app
```

Railway provides `PORT` automatically. The backend Dockerfile uses `${PORT:-8001}`.

After deploy, verify:

```bash
curl https://your-backend.up.railway.app/health
curl https://your-backend.up.railway.app/api/v1/models
```

### 2. Deploy Frontend To Vercel

Create a Vercel project from the repository root.

Use these settings:

```text
Framework preset: Vite
Build command: npm run build
Output directory: dist
```

Set Vercel environment variables:

```env
VITE_API_URL=https://your-backend.up.railway.app
```

`vercel.json` rewrites non-API routes to `index.html` for React Router. API calls use `VITE_API_URL`, so `/api` is not handled by Vercel.

### 3. Smoke Test

Open the Vercel URL and test:

```text
/health through backend status banner
Settings -> add BYOK provider key
Playground -> run a streaming compare
```

If the UI loads but compare fails, check:

```text
VITE_API_URL exactly matches the Railway backend origin
CORS_ORIGINS exactly includes the Vercel frontend origin
Railway /health returns status ok
```

## Local Development

Run backend:

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8001
```

Run frontend:

```bash
npm install
npm run dev
```

Local frontend URL: `http://localhost:8080`.

Local backend URL: `http://127.0.0.1:8001`.

No `VITE_API_URL` is needed locally because Vite proxies `/api` and `/health` to the backend.

## Docker / VPS

For self-hosted Docker deployment, use `docker-compose.prod.yml` and `docs/SELF_HOSTING.md`. In same-origin nginx deployments, leave `VITE_API_URL` empty so the frontend calls `/api` and `/health` on the same host.

## Security Notes

ModelWise is BYOK-first. Provider API keys are sent from the browser as request headers for compare/stream requests and are not stored by the backend.

In production:

- Use HTTPS for both frontend and backend.
- Set `CORS_ORIGINS` to exact frontend origins, not `*`.
- Keep `ENABLE_API_DOCS=false` unless you intentionally expose docs.
- Keep sessions and preferences device-local; use export/import for manual backup.
