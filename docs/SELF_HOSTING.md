# Self-Hosting

ModelWise runs entirely on your infrastructure. No ModelWise cloud is required.

## Quick start (Docker — recommended)

```bash
# 1. Configure environment
cp .env.example .env
# Edit .env — set CORS_ORIGINS to your public URL

# 2. Build and run
docker compose -f docker-compose.prod.yml up -d --build

# 3. Verify
curl http://localhost:8001/health
open http://localhost:8080
```

| Service | Port | Notes |
|---------|------|-------|
| Frontend (nginx + SPA) | 8080 | Serves `dist/`, proxies `/api` |
| Backend (FastAPI) | 8001 | BYOK relay only — no user keys stored |

### Production environment variables

Copy [`.env.example`](../.env.example) → `.env`:

| Variable | Required | Description |
|----------|----------|-------------|
| `CORS_ORIGINS` | Yes (prod) | Your frontend URL, e.g. `https://modelwise.example.com` |
| `ENVIRONMENT` | No | `production` disables OpenAPI docs by default |
| `ENABLE_API_DOCS` | No | Set `false` in production |
| `TRUSTED_PROXY_IPS` | No | CIDRs/IPs allowed to set `X-Forwarded-For` (defaults cover Docker/nginx) |
| `OPENROUTER_API_KEY` | No | Server-side model catalog hydration only |
| `VITE_SUPABASE_URL` | No | Optional cloud sync (build-time arg) |
| `VITE_SUPABASE_ANON_KEY` | No | Optional cloud sync (build-time arg) |

Backend-only config: [backend/env.env.example](../backend/env.env.example) → `backend/env.env` for local non-Docker runs.

---

## Local development

```bash
# Terminal 1 — backend
cd backend && pip install -r requirements.txt
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8001

# Terminal 2 — frontend
npm install && npm run dev
```

- Frontend: **http://localhost:8080**
- Backend: **http://127.0.0.1:8001**
- Vite proxies `/api` and `/health` to the backend

---

## HTTPS (production)

1. Obtain TLS certificates (Let's Encrypt recommended).
2. Use [nginx.ssl.example.conf](../nginx.ssl.example.conf) as a starting point.
3. Mount certs into the frontend container or terminate TLS at an external load balancer.
4. Set `CORS_ORIGINS=https://your-domain.com`.
5. HSTS is enabled in the SSL example config.

If TLS terminates at a load balancer, ensure it forwards:
- `X-Forwarded-For` (real client IP)
- `X-Forwarded-Proto: https`

---

## Security defaults (self-host)

These are enabled out of the box:

- **BYOK**: Provider keys stay in the browser; never stored server-side
- **Rate limiting**: `RateLimitMiddleware` (60/min, 1000/hr default)
- **Trusted proxy IP resolution**: `X-Forwarded-For` only trusted from configured proxy CIDRs
- **SSRF protection**: Custom/relay base URLs must be HTTPS and non-private
- **Production API docs**: Disabled when `ENVIRONMENT=production`
- **Security headers**: CSP, X-Frame-Options, nosniff via nginx + backend middleware
- **Output sanitization**: Model markdown rendered through `rehype-sanitize`

### Pre-deploy checklist

- [ ] `CORS_ORIGINS` set to your exact frontend origin(s)
- [ ] `ENVIRONMENT=production` and `ENABLE_API_DOCS=false`
- [ ] HTTPS enabled with HSTS
- [ ] `backend/env.env` and `.env` not committed
- [ ] No service-role Supabase keys in frontend build args (anon key only)
- [ ] Supabase RLS migrations applied (`001_cloud_sync.sql`, `002_rls_hardening.sql`)
- [ ] SSE proxy buffering disabled on `/api/` (included in `nginx.conf`)

---

## Optional Supabase cloud sync

1. Create a Supabase project.
2. Run migrations in `supabase/migrations/`.
3. Configure OAuth redirect: `https://your-domain.com/auth/callback`
4. Rebuild frontend with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

See [CLOUD_SYNC.md](./CLOUD_SYNC.md) and [SUPABASE_SETUP.md](../SUPABASE_SETUP.md).

---

## Manual production build (no Docker)

```bash
npm run build          # outputs dist/
cd backend
ENVIRONMENT=production uvicorn main:app --host 0.0.0.0 --port 8001
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
| OAuth redirect mismatch | Add `https://your-domain/auth/callback` in Supabase |

---

## What ModelWise does not host

- Model inference billing
- User API keys
- Comparison session data (local IndexedDB by default)
- Account management (optional Supabase only)
