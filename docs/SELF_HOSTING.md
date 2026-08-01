# Self-Hosting

The ModelWise frontend and backend can run on your infrastructure; no ModelWise-operated cloud is required. Requests still leave your infrastructure when you select external AI providers.

## Docker Compose

```bash
# 1. Configure environment
cp .env.example .env
# Edit .env — set CORS_ORIGINS to your public URL

# 2. Build and run
docker compose -f docker-compose.prod.yml up -d --build

# 3. Verify through the frontend proxy
curl http://127.0.0.1:8080/health
```

Open `http://localhost:8080` in a browser.

| Service | Port | Notes |
|---------|------|-------|
| Frontend (nginx + SPA) | Loopback port 8080 by default | Serves `dist/`, proxies `/api` and `/health`; intended for an external TLS terminator |
| Backend (FastAPI) | Internal port 8001 | Available to the Compose network, not published to the host |

Production Compose requires `CORS_ORIGINS` during variable substitution. Compose automatically reads a root `.env` file, or you can supply the variable through the shell or Compose CLI. It also builds `VITE_API_URL` into the frontend image. Leave that variable empty for the supplied same-origin nginx proxy; nginx's CSP permits `connect-src 'self'` only.

### Production environment variables

Copy [`.env.example`](../.env.example) → `.env`:

| Variable | Required | Description |
|----------|----------|-------------|
| `CORS_ORIGINS` | Yes (prod) | Your frontend URL, e.g. `https://modelwise.example.com` |
| `ENVIRONMENT` | No | `production` disables OpenAPI docs by default |
| `ENABLE_API_DOCS` | No | Set `false` in production |
| `TRUSTED_PROXY_IPS` | No | CIDRs/IPs allowed to set `X-Forwarded-For` (defaults cover Docker/nginx) |

Backend-only config: [backend/env.env.example](../backend/env.env.example) → `backend/env.env` for local non-Docker runs.

---

## Local development

```bash
# Terminal 1 — backend
cd backend
python -m pip install --require-hashes -r requirements.lock
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8001

# Terminal 2 — frontend
npm ci
npm run dev
```

- Frontend: **http://localhost:8080**
- Backend: **http://127.0.0.1:8001**
- Vite proxies `/api` and `/health` to the backend

---

## HTTPS (production)

The supplied frontend container listens on HTTP port 8080. Production Compose binds it to `127.0.0.1:${FRONTEND_PORT:-8080}` and keeps the backend on the internal Compose network. No certificate provisioning or TLS termination is included.

For an internet-facing deployment:

1. Put the frontend behind a TLS-terminating reverse proxy or load balancer.
2. Set `CORS_ORIGINS=https://your-domain.example`.
3. Keep `VITE_API_URL` empty when the external proxy sends `/api` and `/health` to the supplied frontend nginx service.
4. Keep backend port 8001 unpublished unless direct access is intentional.
5. Confirm the HSTS policy only after HTTPS works end-to-end. The supplied nginx configuration emits HSTS, but browsers honor it only when received over HTTPS.

If TLS terminates at a load balancer, ensure it forwards:
- `X-Forwarded-For` (real client IP)
- `X-Forwarded-Proto: https`

---

## Security defaults (self-host)

The supplied application and nginx configuration include:

- **BYOK**: Active keys are memory-only by default and transit the backend per request; the backend does not intentionally persist them
- **Rate limiting**: `RateLimitMiddleware` (60/min, 1000/hr default)
- **Trusted proxy IP resolution**: `X-Forwarded-For` only trusted from configured proxy CIDRs
- **SSRF protection**: Custom/relay base URLs must be HTTPS and non-private
- **Production API docs**: Disabled when `ENVIRONMENT=production`
- **Security headers**: CSP, X-Frame-Options, `nosniff`, and HSTS via nginx, plus API response headers from backend middleware
- **Output sanitization**: Model markdown rendered through `rehype-sanitize`

### Pre-deploy checklist

- [ ] `CORS_ORIGINS` set to your exact frontend origin(s)
- [ ] `ENVIRONMENT=production` and `ENABLE_API_DOCS=false`
- [ ] HTTPS works end-to-end and the HSTS policy is appropriate for the domain
- [ ] `backend/env.env` and `.env` not committed
- [ ] SSE proxy buffering disabled on `/api/` (included in `nginx.conf`)
- [ ] Backend port 8001 exposure matches the intended network boundary

### Logs and lifecycle

```bash
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml build --no-cache
```

---

## Manual production build (no Docker)

```bash
npm ci
npm run build          # outputs dist/
cd backend
ENVIRONMENT=production python -m uvicorn main:app --host 0.0.0.0 --port 8001
```

Serve `dist/` with nginx. Proxy `/api/` and `/health` to port 8001. Use the security headers from [nginx.conf](../nginx.conf).

**SSE note:** `proxy_buffering off` is required on `/api/` for live token streaming.

---

## Health checks

```bash
curl http://127.0.0.1:8001/health
# {"status":"ok","service":"modelwise",...}

curl http://127.0.0.1:8001/api/v1/models
# model registry JSON
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Frontend can't reach API | Backend on 8001; check nginx `/api` proxy |
| CORS errors | Add exact origin to `CORS_ORIGINS` (scheme + host + port) |
| Streaming stalls | Disable proxy buffering; check provider keys |
| Rate limit wrong client IP | Set `TRUSTED_PROXY_IPS`; ensure nginx sets `X-Forwarded-For` |
| Empty model list | Start backend; falls back to offline catalog |

---

## What ModelWise does not host

- Model inference billing
- Persistent user API key storage in the backend
- Application-managed comparison session storage outside the user's browser IndexedDB
- Account management or cloud synchronization

External providers still receive prompts, request parameters, and provider credentials for routed requests. Their retention, billing, and privacy policies continue to apply.
