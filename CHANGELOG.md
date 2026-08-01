# Changelog

This project has not published a tagged release. All entries below describe pre-release development.

## Unreleased

### Added

- Dual-model comparison with SSE streaming and live divergence analysis
- Provider routing for OpenAI, Google, Anthropic, OpenRouter, OpenCode Go and Zen, and custom OpenAI-compatible endpoints
- Dynamic model registry with capability metadata
- Provider-native web search and normalized citation events on supported routes
- Browser-based session history, saved prompts, preferences, and encrypted key vault/export
- English, French, and Arabic interface translations
- Docker Compose configurations for local and self-hosted use

### Changed

- API keys are memory-only by default; previously stored plaintext browser keys migrate into memory once and are removed immediately
- Password-protected IndexedDB vault and encrypted file export remain explicit persistence options
- Model registry GET requests no longer carry browser provider keys
- Settings status copy now reports configuration state rather than provider health

### Removed

- Account authentication and cloud sync; sessions and preferences are device-local
