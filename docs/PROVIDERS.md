# Providers & BYOK

ModelWise uses **Bring Your Own Key (BYOK)**. You configure keys in Settings; the backend forwards them to provider APIs per request.

## Provider IDs

| ID | Display label | Key field (Settings) | Direct API |
|----|---------------|----------------------|------------|
| `openai` | OpenAI | OpenAI API Key | api.openai.com |
| `google` | Google | Google AI Key | generativelanguage.googleapis.com |
| `anthropic` | Anthropic | Anthropic API Key | api.anthropic.com |
| `opencode-go` | OpenCode Go | OpenCode workspace key | opencode.ai/zen/go |
| `opencode-zen` | OpenCode Zen | OpenCode workspace key | opencode.ai/zen |
| `meta` | OpenRouter | OpenRouter / relay key | openrouter.ai (default) |
| `custom` | Custom HTTP | Custom key + base URL | User-defined |

## Request headers

The frontend sends keys as headers (never in JSON body):

| Header | Provider |
|--------|----------|
| `X-OpenAI-API-Key` | OpenAI |
| `X-Google-API-Key` | Google Gemini |
| `X-Anthropic-API-Key` | Anthropic |
| `X-OpenCode-API-Key` | OpenCode Go and Zen |
| `X-Meta-API-Key` | OpenRouter / Together relay |
| `X-Meta-Base-Url` | Optional relay base (default OpenRouter) |
| `X-Meta-Key-Header` | Optional auth header name |
| `X-Custom-API-Key` | Custom endpoint |
| `X-Custom-Base-Url` | Custom endpoint URL |

## Routing logic

1. Client sends `leftModel` / `rightModel` (e.g. `google:gemini-2.5-flash`)
2. Optional `leftProvider` / `rightProvider` hint
3. `model_resolver.resolve_side()` picks:
   - **Direct** — if matching key exists
   - **Relay** — e.g. Google model via OpenRouter when only `X-Meta-API-Key` is set
4. Relay models may be remapped via `OPENROUTER_MODEL_MAP`

## OpenRouter

OpenRouter serves two roles:

1. **Primary provider** (`meta`) — OSS models (DeepSeek R1, Llama 4, Qwen 3, Gemma 3)
2. **Fallback relay** — when direct Anthropic/Google keys are missing but relay key exists

Configure the request key in Settings under **OpenRouter**. The backend hydrates the public OpenRouter catalog via `GET /api/v1/models`.

## Custom HTTP

For OpenAI-compatible APIs:

1. Set base URL and API key in Settings
2. Select **Custom HTTP** model slot
3. Backend uses `custom` provider adapter

## Key storage

- Active keys are held in browser memory by default and clear on reload or tab close
- Optional persistence uses a password-protected encrypted IndexedDB vault or encrypted export
- Keys are never written to backend disk or cloud storage by ModelWise
- Clear active keys or delete the encrypted vault anytime from Settings

## Getting keys

| Provider | URL |
|----------|-----|
| OpenAI | https://platform.openai.com/api-keys |
| Google (Gemini) | https://aistudio.google.com/apikey |
| Anthropic | https://console.anthropic.com/ |
| OpenRouter | https://openrouter.ai/keys |

## Error handling

| Situation | Behavior |
|-----------|----------|
| Missing key for selected model | Compare blocked; UI shows `NO KEY` on model picker |
| Invalid key | Provider error surfaced in panel (`error` SSE event) |
| Relay without meta key | `Cannot resolve provider` from backend |
| Backend offline | Toast + degraded offline registry fallback |

## Adding a provider adapter

1. Implement streaming + non-stream in `backend/providers/your_provider.py`
2. Register in `providers/factory.py`
3. Add `PROVIDER_CONFIG` in `src/config/providers.ts`
4. Document key header in this file

See [ARCHITECTURE.md](./ARCHITECTURE.md) and [CONTRIBUTING.md](../CONTRIBUTING.md).
