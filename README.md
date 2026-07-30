# ModelWise

**Open-source real-time frontier AI evaluation workbench.**

Compare two text-model routes side-by-side with SSE streaming, divergence analysis, and BYOK provider routing through a configurable ModelWise backend.

**Live demo:** [aicompare-nexus.vercel.app](https://aicompare-nexus.vercel.app) · **Repository:** [github.com/Archiixyz/aicompare-nexus](https://github.com/Archiixyz/aicompare-nexus)

![ModelWise playground — streaming compare](./docs/screenshots/playground.png)

---

## Privacy & security (BYOK)

- **API keys are memory-only by default** and transit the configured ModelWise backend in request headers. The backend does not intentionally persist them.
- **Encrypted persistence is explicit** through a password-protected IndexedDB device vault or encrypted export.
- **Completed comparisons are saved locally** in browser IndexedDB and never cloud-synced.
- **No account system** — the shipped app is local-only.
- Details: [docs/PRIVACY.md](./docs/PRIVACY.md)

---

## Features

- **Real-time streaming compare** — dual-panel SSE token streaming via `POST /api/v1/stream`
- **Live divergence analysis** — debounced diff while tokens arrive
- **BYOK architecture** — active keys live in browser memory and transit the backend per compare request; the backend does not intentionally persist them
- **OpenRouter support** — optional relay for OSS and frontier models
- **Dynamic model registry** — `GET /api/v1/models` with capability metadata
- **Local session persistence** — comparison history auto-save in browser IndexedDB
- **Self-hostable** — Vite + FastAPI, Docker optional
- **Multilingual UI** — English, French, Arabic (RTL)
- **Provider abstraction** — OpenAI, Google, Anthropic, OpenRouter relay, custom HTTP

---

## Supported Providers

| Provider | Streaming | Relay fallback | Frontend request path | Notes |
|----------|-----------|----------------|-----------------------|-------|
| **OpenAI** | Yes | OpenRouter | Text only | GPT-5.5 family |
| **Google** | Yes | OpenRouter | Text only | Gemini 3.1 / 3.5 family |
| **Anthropic** | Yes | OpenRouter | Text only | Claude Opus 4.8 / Sonnet 4.6 |
| **OpenCode Go / Zen** | Yes | — | Text only | Shared workspace key, two routes |
| **OpenRouter** | Yes | — | Text only | Catalog varies by backend registry |
| **Custom HTTP** | Yes | — | Text only | OpenAI-compatible HTTPS endpoint |

Registry metadata may report multimodal model capability, but the current compare request path sends text prompts only.

Model list is dynamic — see [Model Registry](./docs/REGISTRY.md).

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (React + Vite)                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Playground   │  │ Model        │  │ Session store    │  │
│  │ (SSE client) │  │ Registry     │  │ (IndexedDB)      │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────────────┘  │
│         │ BYOK headers     │ GET /api/v1/models              │
└─────────┼──────────────────┼────────────────────────────────┘
          │                  │
          ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│  FastAPI backend (:8001)                                    │
│  routes/stream · routes/compare · routes/models             │
│  services/stream_service · registry_service                   │
│  providers/ (OpenAI, Google, Anthropic, OpenCode, relays)     │
└─────────┬───────────────────────────────────────────────────┘
          │
          ▼
   Provider APIs (OpenAI, Google, Anthropic, OpenRouter, …)
```

**Streaming flow:** Playground → `POST /api/v1/stream` → parallel provider streams → SSE events (`start`, `token`, `done`, `error`, `complete`) → UI batching via `requestAnimationFrame`.

**Provider routing:** Model ID + optional provider hint → `model_resolver` → direct key or OpenRouter relay slug.

Details: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) · [docs/STREAMING.md](./docs/STREAMING.md)

---

## Quick Start

### Prerequisites

- **Node.js** 18+
- **Python** 3.10+
- At least one provider API key (optional to browse UI; required to compare)

### 1. Clone & install

```bash
git clone https://github.com/Archiixyz/aicompare-nexus.git
cd aicompare-nexus

npm install

cd backend
pip install -r requirements.txt
cd ..
```

### 2. Environment (optional)

```bash
cp backend/env.env.example backend/env.env
# Edit backend/env.env only if you need backend configuration overrides
```

### 3. Run

**Terminal 1 — backend**

```bash
cd backend
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8001
```

**Terminal 2 — frontend**

```bash
npm run dev
```

Open **http://localhost:8080**

| Service | URL |
|---------|-----|
| Frontend | http://localhost:8080 |
| Backend API | http://127.0.0.1:8001 |
| API docs | http://127.0.0.1:8001/docs |

> Vite proxies `/api` and `/health` to port **8001** (see `vite.config.ts`).

### 4. Add API keys

1. Open **Settings → API Keys**
2. Paste your keys (OpenAI, Google, Anthropic, OpenCode, and/or OpenRouter)
3. Go to **Playground** and run a compare

**Gemini quickstart:** Get a key at [Google AI Studio](https://aistudio.google.com/apikey), add it under **Google**, then select `Gemini 3.5 Flash` or `Gemini 3.1 Pro`.

**OpenCode:** Add one OpenCode workspace key to use both Go subscription and Zen pay-as-you-go model routes.

**OpenRouter (optional):** Get a key at [openrouter.ai](https://openrouter.ai), then add it under **OpenRouter** for OSS and relay models.

---

## Environment Variables

### Backend (`backend/env.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Default `8001` |
| `CORS_ORIGINS` | No | Comma-separated frontend origins |

See [backend/env.env.example](./backend/env.env.example).

### Frontend

No `.env` required for local dev — Vite proxies API calls.

For production (Vercel + Railway split deploy), set:

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Public Railway backend URL (no trailing slash) |

See [DEPLOY.md](./DEPLOY.md) and [docs/SELF_HOSTING.md](./docs/SELF_HOSTING.md).

---

## Streaming

ModelWise streams both model responses over a single SSE connection.

```http
POST /api/v1/stream
X-OpenAI-API-Key: sk-...
X-Google-API-Key: AIza...

{"prompt":"...","leftModel":"gpt-5.5","rightModel":"gemini-3.5-flash"}
```

Events: `start` → `token`* → `done` | `error` → `complete`

Full contract: [docs/STREAMING.md](./docs/STREAMING.md)

---

## Model Registry

The UI hydrates models from **`GET /api/v1/models`** — not hardcoded dropdowns.

Each model exposes capability metadata including streaming, context window, multimodal support, reasoning, OSS, free-tier, and relay support. Browser registry GETs do not include provider keys; any OpenRouter merge uses backend configuration.

Details: [docs/REGISTRY.md](./docs/REGISTRY.md)

---

## Screenshots

| Playground (streaming) | Model registry | Settings |
|------------------------|----------------|----------|
| ![Playground](./docs/screenshots/playground.png) | ![Registry](./docs/screenshots/registry.png) | ![Settings](./docs/screenshots/settings.png) |

---

## Docker (optional)

```bash
docker compose up --build
```

Frontend: http://localhost:8080 · Backend: http://localhost:8001

See [docs/SELF_HOSTING.md](./docs/SELF_HOSTING.md) and [DOCKER.md](./DOCKER.md).

---

## Documentation

Sessions, preferences, and encrypted key vaults remain in the current browser. Use session export/import for manual backup or transfer.

| Doc | Topic |
|-----|-------|
| [DEPLOY.md](./DEPLOY.md) | Vercel + Railway production deploy |
| [PRIVACY.md](./docs/PRIVACY.md) | BYOK and local data |
| [CLOUD_SYNC.md](./docs/CLOUD_SYNC.md) | Local-only release status |
| [ARCHITECTURE.md](./docs/ARCHITECTURE.md) | System design |
| [STREAMING.md](./docs/STREAMING.md) | SSE contract |
| [REGISTRY.md](./docs/REGISTRY.md) | Model catalog |
| [PROVIDERS.md](./docs/PROVIDERS.md) | BYOK & routing |
| [SELF_HOSTING.md](./docs/SELF_HOSTING.md) | Deploy guide |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Dev & PR guide |

---

## Roadmap

Realistic next steps (not committed):

- Live provider health probes
- Registry `lastVerified` timestamps
- Cost estimates from registry pricing metadata
- Dedicated benchmarks workspace

Out of scope: hosted inference, billing, teams, agents.

---

## Philosophy

- **Local-first** — active keys default to memory; encrypted key persistence and IndexedDB session auto-save are explicit browser features
- **BYOK** — you pay providers directly; ModelWise adds no inference markup
- **Routing, not inference** — the ModelWise backend forwards prompts and keys to configured external providers
- **No intentional backend key persistence** — provider keys are handled per request and are never cloud-synced
- **Focused tool** — evaluation workbench, not an agent platform or SaaS

---

## License

MIT — see [LICENSE](./LICENSE).
