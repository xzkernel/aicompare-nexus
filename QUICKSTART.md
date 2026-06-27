# Quick Start

> Full guide: [README.md](./README.md) · Self-hosting: [docs/SELF_HOSTING.md](./docs/SELF_HOSTING.md)

```bash
git clone https://github.com/Archiixyz/aicompare-nexus.git
cd modelwise

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
cd backend && python test_server.py
```

## Docker (optional)

```bash
docker compose up --build
```

Frontend: http://localhost:8080 · Backend: http://localhost:8001
