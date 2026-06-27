# Contributing to ModelWise

Thank you for helping improve ModelWise. This is a **focused OSS evaluation tool** — not an agent platform, SaaS product, or workflow engine.

## Philosophy

- **Minimal diffs** — solve the problem, don't refactor adjacent code
- **BYOK-first** — never store or log API keys
- **Backend is canonical** for model lists (`GET /api/v1/models`)
- **No feature creep** — streaming compare, registry, and provider routing are the core

## Project structure

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

**Canonical backend:** `backend/`  
**Deprecated:** `app/` (legacy — do not extend)

## Local setup

```bash
git clone <repo>
cd modelwise
npm install

cd backend
pip install -r requirements.txt
cp env.env.example env.env   # optional
python -m uvicorn main:app --reload --port 8001

# separate terminal
npm run dev
```

Open http://localhost:8080

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

1. Add `backend/providers/your_provider.py` implementing stream + ask
2. Wire in `providers/factory.py`
3. Update `utils/model_resolver.py` if inference rules needed
4. Add `PROVIDER_CONFIG` entry in `src/config/providers.ts`
5. Document headers in `docs/PROVIDERS.md`

### Streaming guidelines

- Emit SSE events: `start`, `token`, `done`, `error`, `complete`
- See [docs/STREAMING.md](./docs/STREAMING.md)
- Frontend batches tokens with rAF — don't assume per-token React renders
- Support `AbortController` cancellation

### Registry changes

1. Edit `backend/registry/catalog.py`
2. Add relay mapping in `OPENROUTER_MODEL_MAP` if slug differs
3. No frontend model list edits required (hydrates from API)

## Pull requests

- One concern per PR when possible
- Update docs if you change API contracts or env vars
- Verify `npm run build` passes
- Verify backend starts: `python -m uvicorn main:app --port 8001`
- No committed secrets (`.env`, `env.env`)
- Screenshots in `docs/screenshots/` if UI changes materially

## What we won't merge (for now)

- Auth/billing/SaaS systems
- Agent workflows or tool orchestration
- Cloud sync or team features
- Hosted inference layers
- Analytics/telemetry platforms

## Tests

```bash
npm run build
npm run test          # Playwright (if configured)
cd backend && python -m pytest  # when tests exist
```

## Questions

Open a GitHub issue with the `question` label or check existing docs in `docs/`.
