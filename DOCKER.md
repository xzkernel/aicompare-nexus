# Docker

Quick reference for containerized ModelWise.

## Ports

| Service | Host port | Container |
|---------|-----------|-----------|
| Frontend (nginx) | **8080** | 80 |
| Backend (uvicorn) | **8001** | 8001 |

## Quick start

```bash
cp backend/env.env.example backend/env.env   # optional
docker compose up --build
```

- App: http://localhost:8080
- API: http://localhost:8001
- Health: http://localhost:8001/health

## Production

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

## Logs & lifecycle

```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose down
docker compose build --no-cache
```

## Notes

- Frontend nginx proxies `/api` and `/health` to the backend service
- BYOK keys are **not** passed via Docker env — users enter keys in the browser
- Optional `OPENROUTER_API_KEY` in compose env expands server-side model catalog

Full guide: [docs/SELF_HOSTING.md](./docs/SELF_HOSTING.md)
