# Web Search and Grounding

ModelWise can request provider-native web search on selected routes. It does not run a crawler, retrieval index, or custom RAG service. Search requests, results, and billing remain subject to the selected provider and account.

## Request contract

Both `POST /api/v1/stream` and `POST /api/v1/ask` accept an optional `searchMode` field:

```json
{
  "prompt": "What changed in this week's release?",
  "leftModel": "gemini-3.5-flash",
  "rightModel": "claude-sonnet-4-6",
  "leftProvider": "google",
  "rightProvider": "anthropic",
  "searchMode": "auto"
}
```

| Mode | Behavior |
|------|----------|
| `off` | Do not enable provider-native search. This is also the default when the field is omitted. |
| `auto` | Enable the route's search tool and allow the provider to decide whether to use it. |
| `force` | Enable search and add a provider-specific instruction requiring its use. Provider behavior can still depend on model and account capabilities. |

The Playground stores the selected mode in browser `localStorage` under `modelwise-search-prefs`. It is not sent to a cloud-sync service.

## Route support

Support is based on the resolved route, which can differ from the model's catalog provider when relay fallback is used.

| Resolved route | Integration | Search metadata |
|----------------|-------------|-----------------|
| Google | Gemini `google_search` grounding tool | Queries and grounding chunks when returned by Gemini |
| Anthropic | Claude `web_search_20250305` tool | Queries and citations when returned by Anthropic |
| OpenRouter (`meta`) | OpenRouter `web` plugin | Queries and annotations when returned by OpenRouter/model |
| OpenAI | Not enabled | Search is skipped |
| OpenCode Go / Zen | Not enabled | Search is skipped |
| Custom HTTP | Not enabled | Search is skipped even if the custom endpoint has its own tool API |

Route support does not guarantee that a search runs or that citations are returned. Model availability, tool support, account permissions, quotas, and provider behavior can vary.

## Streaming events

Search events supplement the base SSE contract in [STREAMING.md](./STREAMING.md).

| Event | Payload fields |
|-------|----------------|
| `start` | `side`, `model`, `provider`, `searchCapability` |
| `search_start` | `side`, `provider`, `mode` |
| `search_sources` | `side`, `queries`, `provider` |
| `grounding` | `side`, plus provider-specific `provider`, `phase`, or `label` fields when available |
| `citations` | `side`, `metadata` |
| `search_complete` | `side`, then either `metadata` or `skipped` and `reason` |
| `done` | Base fields plus optional `searchMetadata` |

Events are emitted independently for the left and right sides. An unsupported route emits `search_complete` with a skip reason and continues with a normal model response.

## Normalized metadata

Citation-bearing events and `done.searchMetadata` use this shape:

```json
{
  "grounded": true,
  "citations": [
    {
      "title": "Source title",
      "url": "https://example.com/article",
      "hostname": "example.com",
      "provider": "google",
      "snippet": "Optional provider text"
    }
  ],
  "searchLatencyMs": 2400,
  "searchProvider": "google",
  "searchQueries": ["example query"],
  "searchMode": "auto",
  "liveSearch": true,
  "used": true
}
```

Fields based on provider output can be absent or empty. `grounded`, `liveSearch`, and `used` report observed metadata; they do not verify factual accuracy, source quality, or completeness.

## Non-streaming behavior

`POST /api/v1/ask` passes `searchMode` to provider adapters, but its response schema contains response text and timing only. Use the streaming endpoint when the client needs normalized citation and search-status events.

## Data and cost boundaries

- Search uses the same browser-to-backend-to-provider path as other comparisons.
- The provider receives the prompt, credentials, model settings, and search request.
- Search queries, source URLs, snippets, and response text can transit the ModelWise backend.
- Provider-specific search and token charges may apply. Check the provider's current pricing and terms rather than relying on fixed prices in this repository.
- Citations indicate provider-returned sources, not independent verification by ModelWise.
