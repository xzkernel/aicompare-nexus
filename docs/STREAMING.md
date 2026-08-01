# ModelWise streaming contract

## Endpoint

`POST /api/v1/stream`

Same BYOK headers and JSON body as `/api/v1/ask`:

```json
{
  "prompt": "...",
  "leftModel": "gpt-5.5",
  "rightModel": "gemini-3.5-flash",
  "leftProvider": "openai",
  "rightProvider": "google"
}
```

Headers (optional, BYOK): `X-OpenAI-API-Key`, `X-Google-API-Key`, `X-Anthropic-API-Key`, `X-OpenCode-API-Key`, `X-Meta-API-Key`, `X-Custom-API-Key`, and the relay/custom endpoint headers documented in [PROVIDERS.md](./PROVIDERS.md).

## SSE events

| Event | Payload |
|-------|---------|
| `start` | `{ side, model, provider? }` |
| `token` | `{ side, delta }` |
| `done` | `{ side, elapsed, text? }` |
| `error` | `{ side, message, elapsed? }` |
| `complete` | `{ prompt, leftModel, rightModel }` |

When `searchMode` is `auto` or `force`, supported routes can also emit `search_start`, `search_sources`, `grounding`, `citations`, and `search_complete`. The `start` payload includes route-level search capability, and `done` can include normalized `searchMetadata`. See [WEB_SEARCH.md](./WEB_SEARCH.md).

## Frontend flow

1. `PromptPlayground` builds headers via `buildCompareHeaders()`.
2. `consumeCompareStream()` reads the response body with `fetch` + `ReadableStream`.
3. Token events are batched with `requestAnimationFrame` (~1 frame) to limit rerenders.
4. `PlaygroundWorkbench` uses `useStreamDiff()` (200ms debounce) for live divergence.
5. `AbortController` cancels in-flight streams; stale events are ignored via generation id.

## Panel states

| `ModelResponse.status` | UI |
|------------------------|-----|
| `loading` | Connecting — subtle pulse |
| `streaming` | Live text + cursor |
| `complete` | Markdown tabs |
| `error` | Error message |

## Cancellation

- New compare or explicit Cancel calls `abortController.abort()`.
- Reader is released; generation counter prevents late token appends.

## Provider support

Streaming is implemented for OpenAI, Anthropic, Gemini, OpenCode Go and Zen, OpenRouter-compatible relays, and custom OpenAI-compatible endpoints. Provider-native web search is a separate, narrower capability documented in [WEB_SEARCH.md](./WEB_SEARCH.md).

## Limitations

- Diff is line-level and debounced, not token-accurate.
- Markdown rendering activates after stream completes (raw text during stream).
- No resume of partial streams after disconnect.
