# Model Registry

Canonical source: **`GET /api/v1/models`**

Related: [PROVIDERS.md](./PROVIDERS.md) · [ARCHITECTURE.md](./ARCHITECTURE.md)

## Backend

| Path | Role |
|------|------|
| `backend/registry/catalog.py` | Frontier model catalog + provider labels |
| `backend/services/registry_service.py` | Builds API response; optional OpenRouter merge |
| `backend/routes/models.py` | HTTP handler + degraded fallback |
| `backend/utils/model_resolver.py` | Relay slug map + provider inference |

### Model object schema

```json
{
  "id": "gpt-5.5",
  "name": "GPT-5.5",
  "provider": "openai",
  "supportsStreaming": true,
  "contextWindow": "1M",
  "multimodal": true,
  "reasoning": true,
  "freeTier": false,
  "openSource": false,
  "relaySupported": true,
  "openRouterId": "openai/gpt-5.5",
  "typicalLatency": "~2.2s",
  "supportsWebSearch": false,
  "source": "catalog"
}
```

### Live hydration

The backend merges up to 200 relevant models from the public OpenRouter catalog and hydrates the OpenCode Go and Zen model lists. Registry requests do not carry browser provider keys.

## Frontend

| Path | Role |
|------|------|
| `src/types/registry.ts` | Shared TypeScript types |
| `src/lib/model-registry/` | Fetch, cache (5 min TTL), normalize, helpers |
| `src/hooks/use-model-registry.ts` | React hook + filter memoization |
| `src/config/providers.ts` | BYOK/relay branding only (no model lists) |
| `src/components/RegistryBootstrap.tsx` | Shell prefetch |

## Adding a model

1. Add an entry to `FRONTIER_CATALOG` in `backend/registry/catalog.py`.
2. If relay routing differs, add a mapping in `OPENROUTER_MODEL_MAP` (`model_resolver.py`).
3. Restart backend; frontend hydrates on next cache miss.

## Provider labels

| ID | Display | Relay |
|----|---------|-------|
| openai | OpenAI | — |
| google | Google | — |
| anthropic | Anthropic | OpenRouter (fallback) |
| opencode-go | OpenCode Go | — |
| opencode-zen | OpenCode Zen | — |
| meta | OpenRouter | OpenRouter |
| custom | Custom HTTP | — |
