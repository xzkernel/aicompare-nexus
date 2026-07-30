# Changelog

## Unreleased

### Changed
- API keys are memory-only by default; legacy plaintext browser keys migrate into memory once and are removed immediately
- Password-protected IndexedDB vault and encrypted file export remain explicit persistence options
- Model registry GET requests no longer carry browser provider keys
- Settings status copy now reports configuration state rather than provider health
- Removed account authentication and cloud sync; sessions and preferences are device-local

## [1.0.0] - 2025-07-23

### Added
- Real-time streaming model comparison with dual-panel SSE
- BYOK (Bring Your Own Key) routing through the ModelWise backend
- Dynamic model registry with capability metadata
- Provider support: OpenAI, Google, Anthropic, OpenRouter, Custom HTTP
- Live divergence analysis during streaming
- Local session persistence via IndexedDB
- Optional Supabase cloud sync for multi-device session backup
- Multilingual UI: English, French, Arabic (RTL)
- Docker support with docker-compose for self-hosting
- BYOK provider routing with OpenRouter relay fallback
- Web search toggle for supported providers
- Citation and groundedness display
- Password-protected API key export/import
- Dark theme with terminal-inspired design
