# ModelWise streaming contract

## Endpoint

`POST /api/v1/stream`

Same BYOK headers and JSON body as `/api/v1/ask`:

```json
{
  "prompt": "...",
  "leftModel": "gpt-4o",
  "rightModel": "gemini-2.5-flash",
  "leftProvider": "openai",
  "rightProvider": "google"
}
```

Headers (optional, BYOK): `X-OpenAI-API-Key`, `X-Google-API-Key`, `X-Anthropic-API-Key`, `X-Meta-API-Key`, relay base URL headers.

## SSE events

| Event | Payload |
|-------|---------|
| `start` | `{ side, model, provider? }` |
| `token` | `{ side, delta }` |
| `done` | `{ side, elapsed, text? }` |
| `error` | `{ side, message, elapsed? }` |
| `complete` | `{ prompt, leftModel, rightModel }` |

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

Streaming is implemented for OpenAI, Anthropic, Gemini, and OpenAI-compatible relays (Meta/custom).

## Limitations

- Diff is line-level and debounced, not token-accurate.
- Markdown rendering activates after stream completes (raw text during stream).
- No resume of partial streams after disconnect.
