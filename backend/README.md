# ModelWise Backend

FastAPI backend for BYOK AI model comparison and streaming.

**Full documentation:** [../README.md](../README.md) · [../docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md)

## Quick start

```bash
pip install -r requirements.txt
cp env.env.example env.env   # optional
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8001
```

- API: http://127.0.0.1:8001
- Docs: http://127.0.0.1:8001/docs

## Key endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/api/v1/models` | Dynamic model registry |
| POST | `/api/v1/ask` | Non-streaming compare |
| POST | `/api/v1/stream` | SSE streaming compare |

## Environment

See [env.env.example](./env.env.example). BYOK mode requires **no server-side API keys**.

## Docker

```bash
docker build -t modelwise-backend .
docker run -p 8001:8001 modelwise-backend
```

Port **8001** matches the Vite dev proxy and production nginx config.
