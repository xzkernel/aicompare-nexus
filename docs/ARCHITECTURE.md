# Architecture

ModelWise is a **local-first BYOK evaluation workbench**: React frontend + FastAPI backend that routes requests to third-party AI APIs.

## Repository layout

```
aicompare-nexus/
├── src/                    # React frontend (Vite)
│   ├── components/         # UI (playground, landing, settings)
│   ├── lib/                # compare-stream, model-registry, session-store
│   ├── hooks/              # use-model-registry, use-stream-diff
│   └── config/providers.ts # BYOK branding + relay config (no model lists)
├── backend/
│   ├── main.py             # App entry — mounts routers only
│   ├── routes/             # compare, stream, models, health
│   ├── services/           # compare_service, stream_service, registry_service
│   ├── providers/          # openai, google, anthropic, opencode, meta, custom
│   ├── registry/           # Frontier model catalog
│   └── utils/              # BYOK headers, model_resolver
└── docs/                   # Architecture, streaming, registry, providers
```

## Request paths

### Compare (non-streaming)

```
Browser ──POST /api/v1/ask──► FastAPI ──► providers/* ──► OpenAI / Google / …
         BYOK headers in request
```

### Streaming compare (primary UX)

```
Browser ──POST /api/v1/stream──► stream_service
                                      ├── provider A (async generator)
                                      └── provider B (async generator)
                                 SSE multiplex ──► Browser
```

### Model registry

```
Browser ──GET /api/v1/models──► registry_service
                                     ├── FRONTIER_CATALOG (static)
                                     ├── public OpenRouter merge
                                     └── OpenCode Go / Zen model lists
```

## Frontend modules

| Module | Role |
|--------|------|
| `PromptPlayground` | Orchestrates compare, abort, session save |
| `consumeCompareStream` | SSE reader + event dispatch |
| `buildCompareHeaders` | Maps BYOK keys to `X-*-API-Key` headers |
| `useModelRegistry` | Cached registry hydration + filters |
| `session-store` | IndexedDB comparison history |

## Backend modules

| Module | Role |
|--------|------|
| `model_resolver` | Infer provider from model ID; map relay slugs |
| `ByokHeaders` | Parse incoming key headers |
| `registry/catalog.py` | Single source of frontier model metadata |
| `providers/factory.py` | Instantiate provider adapter |

## Security model

1. **Memory-only key default** — `secure-api-keys` holds active keys in runtime memory
2. **Explicit encrypted persistence** — password-protected IndexedDB vault or encrypted file export
3. **Backend key transit** — selected keys and prompts pass per request in headers/body; the backend does not intentionally persist keys
4. **Backend is a forwarder** — external providers receive requests and perform inference
5. **CORS restricted** — dev origins in `CORS_ORIGINS`

## Data flow diagram

```mermaid
sequenceDiagram
  participant UI as Playground UI
  participant API as FastAPI
  participant P1 as Provider A
  participant P2 as Provider B

  UI->>API: POST /api/v1/stream + BYOK headers
  API->>P1: stream request (left model)
  API->>P2: stream request (right model)
  loop SSE
    P1-->>API: token chunk
    API-->>UI: event token (left)
    P2-->>API: token chunk
    API-->>UI: event token (right)
  end
  API-->>UI: event complete
  UI->>UI: save successful or partial session (IndexedDB)
```

## Extension points

- **New provider:** add adapter under `backend/providers/`, register in factory, add `PROVIDER_CONFIG` entry in frontend
- **New model:** add to `backend/registry/catalog.py` + relay map if needed
- **New capability badge:** extend registry schema + `getModelCapabilities()`

See [CONTRIBUTING.md](../CONTRIBUTING.md).
