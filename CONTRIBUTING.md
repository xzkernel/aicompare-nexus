# Contributing to ModelWise

Thank you for helping improve ModelWise. The project focuses on model comparison, registry, and provider routing rather than account, billing, or agent-orchestration features.

## Philosophy

- **Minimal diffs** — solve the problem, don't refactor adjacent code
- **BYOK-first** — do not persist or log plaintext API keys
- **Backend is canonical** for model lists (`GET /api/v1/models`)
- **No feature creep** — streaming compare, registry, and provider routing are the core

## Project structure

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

The frontend is in `src/`; the FastAPI backend is in `backend/`.

## Local setup

Prerequisites are Node.js 22.13+ and Python 3.11.

```bash
git clone https://github.com/xzkernel/aicompare-nexus.git
cd aicompare-nexus
npm ci
cd backend
python -m pip install --require-hashes -r requirements-dev.lock
```

Run the backend from `backend/`:

```bash
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8001
```

In a separate terminal, run the frontend from the repository root:

```bash
npm run dev
```

Open `http://localhost:8080`. Copy `backend/env.env.example` to `backend/env.env` only when you need backend configuration overrides; never commit that file.

## Coding guidelines

### TypeScript / React

- Match existing Tailwind + mono workbench aesthetic
- Use `@/` path aliases
- Registry data via `useModelRegistry()` — **no hardcoded model arrays**
- Prefer hooks + module cache over global context unless necessary

### Python / FastAPI

- Routers stay thin; logic in `services/`
- Provider code in `providers/`
- Model metadata in `registry/catalog.py` only

### Provider adapter extension

1. Add `backend/providers/your_provider.py` implementing stream and non-stream requests.
2. Wire it into `backend/providers/factory.py`.
3. Update `backend/utils/model_resolver.py` if routing rules are needed.
4. Add its configuration to `src/config/providers.ts`.
5. Document its headers in `docs/PROVIDERS.md`.

### Streaming guidelines

- Emit SSE events: `start`, `token`, `done`, `error`, `complete`
- See [docs/STREAMING.md](./docs/STREAMING.md)
- Frontend batches tokens with rAF — don't assume per-token React renders
- Support `AbortController` cancellation

### Registry changes

1. Edit `backend/registry/catalog.py`.
2. Add a relay mapping in `OPENROUTER_MODEL_MAP` if the provider slug differs.
3. Do not add a duplicate frontend model list; the UI hydrates from the API.

## Pull requests

- One concern per PR when possible
- Update docs if you change API contracts or env vars
- Run the applicable checks listed below.
- Verify the backend starts from `backend/`: `python -m uvicorn main:app --host 127.0.0.1 --port 8001`.
- No committed secrets (`.env`, `env.env`)
- Screenshots in `docs/screenshots/` if UI changes materially

## What we won't merge (for now)

- Auth/billing/SaaS systems
- Agent or tool-orchestration features
- Cloud sync or team features
- Hosted inference layers
- Analytics/telemetry platforms

## Tests

Frontend checks from the repository root:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm exec -- playwright test --config=scripts/playwright.config.mjs
```

Backend tests from `backend/`:

```bash
python -m pip install --require-hashes -r requirements-dev.lock
python -m pytest
```

The Playwright command starts the built frontend through the configured preview server, so run it after `npm run build`. Runtime dependencies remain declared in `backend/requirements.txt`; reproducible development installs use `backend/requirements-dev.lock`.

## Questions

See [SUPPORT.md](./SUPPORT.md) before opening an issue.
