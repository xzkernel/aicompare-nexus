# Privacy

ModelWise is a **local-first, BYOK (Bring Your Own Key)** evaluation workbench.

## What stays on your device

| Data | Storage | Synced? |
|------|---------|---------|
| Provider API keys | Memory by default; optional encrypted IndexedDB vault/export | **Never synced** |
| Comparison sessions | Automatically saved in IndexedDB after a successful or partial run | **Never synced** |
| Preferences (theme, locale) | IndexedDB | **Never synced** |
| Saved prompts | IndexedDB | **Never synced** |

## What leaves your browser

When you run a compare:

1. Your **prompt** and **model selection** are sent to the ModelWise backend you configure (self-hosted, Railway, etc.).
2. Your **provider API keys** are sent as **HTTP headers** on those requests so the backend can forward to OpenAI, Google, Anthropic, or other providers.
3. The backend **does not intentionally persist** your API keys.
4. The selected external providers receive the prompt, key, and request parameters needed to perform inference under their own privacy policies.

Model responses stream back over SSE and are shown in the UI. Successful and partial comparisons are saved locally as session history in IndexedDB.

Transport should use HTTPS, but this is not end-to-end encryption between your browser and the external provider because the ModelWise backend must read and forward the request.

## Local-only operation

- ModelWise has no account or cloud-sync flow in the shipped application.
- Sessions and preferences remain in the current browser's IndexedDB.
- Session export/import provides manual backup and transfer.

## Operator responsibilities

If you deploy ModelWise for others:

- Use **HTTPS** on frontend and backend.
- Set **`CORS_ORIGINS`** to your exact frontend origin(s).
- Do not log request headers containing API keys.
- Add a link to this page from your deployed instance if you serve public users.

## Contact

For the official repository, open an issue at [github.com/Archiixyz/aicompare-nexus](https://github.com/Archiixyz/aicompare-nexus).
