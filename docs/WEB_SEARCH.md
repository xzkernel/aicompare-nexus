# Phase 10 — Web Search / Grounded Retrieval

Provider-native live search only. No custom RAG, crawlers, or hosted retrieval.

## Provider support matrix (Phase 10A)

| Provider | Search support | Streaming compatible | Citation support | Requires special model |
| -------- | -------------- | -------------------- | ---------------- | ---------------------- |
| **Google (direct)** | `google_search` grounding tool | Yes — `streamGenerateContent` + tools | `groundingMetadata.groundingChunks` (title, uri) | Gemini 2.0+ / 2.5+ / 3.x family |
| **Anthropic (direct)** | `web_search_20250305` tool (GA) | Yes — SSE with tool + citation deltas | `web_search_result_location` (url, title, cited_text) | Claude 3.5+, Sonnet 4, Opus 4+ |
| **OpenRouter (meta relay)** | `openrouter:web_search` server tool | Yes — tool-calling models stream after server-side search | Annotations / plugin metadata (best-effort normalize) | Model must support tool calling |
| **OpenAI (direct BYOK)** | **Not enabled** — Chat Completions has no native web search in this integration | N/A | N/A | Responses API browsing is separate; not wired |
| **Custom HTTP** | Unknown — no search unless endpoint supports tools | Varies | Varies | User-defined |

### Cost & failure modes

| Provider | Billing notes | Common failures |
| -------- | ------------- | --------------- |
| Google | Per search query executed (~$14/1k on paid tier) | `API_KEY_INVALID`, quota, model without grounding |
| Anthropic | ~$10/1k searches + tokens | Tool not enabled for model, rate limits |
| OpenRouter | Per engine (native/exa/parallel) + model tokens | Model without tool support, 401 relay key |
| OpenAI | N/A (disabled) | Toggle blocked in UI |

### Streaming + grounding

All three enabled providers support streaming with search. Search phases emit dedicated SSE events before/during token stream (`search_start`, `search_sources`, `grounding`, `citations`, `search_complete`).

## Architecture

```
Playground policy → StreamRequest { searchMode }
    → stream_service._stream_side(search_opts)
    → provider.stream_events(prompt, search_opts)
    → normalize.py → unified SearchMetadata
    → SSE → compare-stream.ts → UI (GroundedBadge, CitationsPanel)
```

## Normalized citation format

See `backend/services/search/normalize.py` — mirrored in `src/lib/search-metadata.ts`.

## Configuration

- **auto** — enable native search on supported routes; model decides when to query
- **force** — require search (system hint + tool enabled where supported)
- **off** — plain chat, backward compatible

Defaults persist in `localStorage` (`modelwise-search-prefs`); never synced to cloud.

---

## Phase 10 implementation report

### 1. Provider support matrix
See table at top of this document.

### 2. Grounding architecture
- Request: `searchMode` on `StreamRequest` / `AskRequest` (`auto` | `force` | `off`)
- Resolution: `ResolvedSearchOptions.from_request()` in `backend/schemas/search.py`
- Providers yield `ProviderStreamEvent` (`token`, `search_*`) via `stream_events()`
- Normalization: `backend/services/search/normalize.py` → unified `SearchMetadata`
- UI consumes via `compare-stream.ts` SSE parser

### 3. Streaming event additions
| Event | Payload |
|-------|---------|
| `search_start` | side, provider, mode, liveSearch |
| `search_sources` | side, queries[], provider |
| `grounding` | side, provider, phase |
| `citations` | side, metadata (normalized) |
| `search_complete` | side, metadata \| skipped + reason |

Existing `start`, `token`, `done`, `error`, `complete` unchanged.

### 4. Citation normalization format
```json
{
  "grounded": true,
  "citations": [{ "title", "url", "hostname", "provider", "snippet?" }],
  "searchLatencyMs": 2400,
  "searchProvider": "google",
  "searchQueries": ["weather agadir"],
  "searchMode": "auto",
  "liveSearch": true
}
```

### 5. Supported models
- **Google direct:** Gemini 2.5 Pro/Flash (grounding tool)
- **Anthropic direct:** Claude Sonnet 4, Opus 4 (web_search tool)
- **OpenRouter relay:** any tool-calling model via `openrouter:web_search`

### 6. Unsupported provider behavior
- **OpenAI direct:** search skipped with explicit reason; plain chat continues
- **Custom HTTP:** skipped (not in allowlist)
- UI shows hints when one/both routes lack search support

### 7. Performance impact
- Search adds provider-side latency (often 2–20s+) before/during token stream
- Search latency tracked in `searchLatencyMs` per panel
- Search uses the same browser → ModelWise backend → provider request path as standard comparisons

### 8. Files modified / created
**Created:** `docs/WEB_SEARCH.md`, `backend/schemas/search.py`, `backend/providers/stream_events.py`, `backend/services/search/*`, `src/lib/search-metadata.ts`, `src/lib/search-prefs.ts`, `src/lib/search-capabilities.ts`, `src/hooks/use-grounding.ts`, `GroundedBadge.tsx`, `CitationsPanel.tsx`, `PlaygroundWebSearchControls.tsx`

**Modified:** provider adapters, `stream_service.py`, `compare_service.py`, stream/compare schemas, `compare-stream.ts`, `PromptPlayground.tsx`, `PlaygroundWorkbench.tsx`, `PlaygroundToolbar.tsx`, `ComparisonOutputPanel.tsx`, `LiveResponseDiff.tsx`, registry types/catalog, `SettingsApiKeysSection.tsx`

### 9. Remaining limitations
- OpenAI native web search not wired (Chat Completions BYOK)
- OpenRouter citations depend on model/tool-call support — metadata best-effort
- Per-side search overrides deferred (v1 global only)
- Session persistence does not yet store citations in IndexedDB
- `:online` slug deprecated by OpenRouter — using server tool instead

### 10. Known provider inconsistencies
- Gemini may ground without obvious queries in stream metadata on some models
- Claude may refuse search on certain account tiers
- OpenRouter search engine varies (native vs Exa) by model route
- Grounded badge vs actual factual accuracy — citations indicate search ran, not truth
