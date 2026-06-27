# Quick Start

> Full guide: [README.md](./README.md) · Deploy: [DEPLOY.md](./DEPLOY.md) · Self-hosting: [docs/SELF_HOSTING.md](./docs/SELF_HOSTING.md)

```bash
git clone https://github.com/Archiixyz/aicompare-nexus.git
cd aicompare-nexus

npm install

cd backend
pip install -r requirements.txt
cp env.env.example env.env   # optional
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8001
```

New terminal:

```bash
npm run dev
```

Open **http://localhost:8080** · API docs **http://127.0.0.1:8001/docs**

Add API keys in **Settings**, then compare models in **Playground**.

## Verify

```bash
curl http://127.0.0.1:8001/health
curl http://127.0.0.1:8001/api/v1/models
```

## Production (Vercel + Railway)

1. Deploy `backend/` to **Railway** — set `CORS_ORIGINS` to your Vercel URL.
2. Deploy repo root to **Vercel** — set `VITE_API_URL` to your Railway URL.
3. See [DEPLOY.md](./DEPLOY.md) for the full checklist.

## Docker (optional)

```bash
docker compose up --build
```

Frontend: http://localhost:8080 · Backend: http://localhost:8001
