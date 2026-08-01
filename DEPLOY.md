# Deployment Guide

ModelWise is a split full-stack application: a Vite SPA frontend and a FastAPI backend. This guide documents a Vercel frontend with a Railway backend; other hosts can use the same build and runtime boundaries.

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

The supplied `vercel.json` uses same-origin rewrites for `/api/*` and `/health`, with a fixed Railway destination for the hosted application. For that deployment, leave `VITE_API_URL` unset.

For a different backend, choose one approach:

1. Keep same-origin browser requests by leaving `VITE_API_URL` unset and changing the two rewrite destinations in `vercel.json` to your backend.
2. Send browser requests directly to the backend by setting:

```env
VITE_API_URL=https://your-backend.up.railway.app
```

`VITE_API_URL` is embedded in the frontend bundle at build time. With a value set, the browser calls that origin directly and Railway `CORS_ORIGINS` must allow the Vercel origin. With no value, requests use same-origin paths and the Vercel rewrites forward them.

`vercel.json` also rewrites non-API routes to `index.html` for React Router. Its Content Security Policy allows connections only to the application origin and `https://aicompare-nexus-production.up.railway.app`. A deployment using a different direct `VITE_API_URL` must allow that exact origin in `connect-src`, or browsers will block API and SSE requests. Environment variables do not modify the static CSP.

### 3. Smoke Test

Open the Vercel URL and test:

```text
/health through backend status banner
Settings -> add BYOK provider key
Playground -> run a streaming compare
```

If the UI loads but compare fails, check:

```text
For same-origin mode, vercel.json API rewrites target the Railway backend
For direct mode, VITE_API_URL and CSP connect-src match the Railway backend origin
CORS_ORIGINS exactly includes the Vercel frontend origin
Railway /health returns status ok
```

## Local Development

Run backend:

```bash
cd backend
python -m pip install --require-hashes -r requirements.lock
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8001
```

Run frontend:

```bash
npm ci
npm run dev
```

Local frontend URL: `http://localhost:8080`.

Local backend URL: `http://127.0.0.1:8001`.

No `VITE_API_URL` is needed locally because Vite proxies `/api` and `/health` to the backend.

## Docker / VPS

For self-hosted Docker deployment, use `docker-compose.prod.yml` and [docs/SELF_HOSTING.md](./docs/SELF_HOSTING.md). Leave `VITE_API_URL` empty for the supplied nginx configuration so the frontend calls `/api` and `/health` on the same origin. Production Compose binds the HTTP frontend to loopback and does not publish the backend; put the frontend behind a TLS-terminating reverse proxy or load balancer.

## Security Notes

ModelWise is BYOK-first. Provider API keys are sent from the browser as request headers for compare/stream requests and are not stored by the backend.

In production:

- Use HTTPS for both frontend and backend.
- Set `CORS_ORIGINS` to exact frontend origins, not `*`.
- Keep `ENABLE_API_DOCS=false` unless you intentionally expose docs.
- Review the frontend CSP whenever the backend origin changes.
- Treat browser storage as local application state, not as a backup; use export/import when a transferable copy is needed.
