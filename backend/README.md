# ModelWise Backend

FastAPI backend for BYOK AI model comparison and streaming.

Requires Python 3.11.

**Full documentation:** [../README.md](../README.md) · [../docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md)

## Quick start

```bash
python -m pip install --require-hashes -r requirements.lock
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

## Tests

Install the hashed development lock before running the test suite:

```bash
python -m pip install --require-hashes -r requirements-dev.lock
python -m pytest
```

## Docker

```bash
docker build -t modelwise-backend .
docker run -p 8001:8001 modelwise-backend
```

Run these commands from `backend/`. The image uses Python 3.11 and exposes plain HTTP on port **8001**, matching the Vite development proxy and production nginx upstream.
