# Privacy

ModelWise stores application state in the browser and uses BYOK (Bring Your Own Key) credentials for provider requests. Local storage does not make inference local: the configured backend and selected external providers process comparison requests.

## Browser persistence

| Data | Browser storage | Application cloud sync |
|------|-----------------|------------------------|
| Provider API keys | Memory by default; optional encrypted IndexedDB vault or encrypted export | Not implemented |
| Comparison sessions | IndexedDB after a successful or partial run | Not implemented |
| Preferences (theme, locale) | IndexedDB | Not implemented |
| Web-search preference | `localStorage` | Not implemented |
| Saved prompts | IndexedDB | Not implemented |

Browser storage is local to a browser profile, but it may still be available to people or software with access to that profile or device. ModelWise does not provide a cloud backup for this data.

## What leaves your browser

When you run a compare:

1. Your **prompt** and **model selection** are sent to the ModelWise backend you configure (self-hosted, Railway, etc.).
2. Your **provider API keys** are sent as **HTTP headers** on those requests so the backend can forward to OpenAI, Google, Anthropic, or other providers.
3. The backend application has no API-key persistence feature. Deployment infrastructure and operator logging are outside the application's control, so operators must avoid recording sensitive headers.
4. The selected external providers receive the prompt, key, and request parameters needed to perform inference under their own privacy policies.

Model responses stream back over SSE and are shown in the UI. Successful and partial comparisons are saved as session history in IndexedDB. Response diffing and comparison-history management run in the browser; model inference and provider-native web search run remotely on the selected provider route.

Transport should use HTTPS, but this is not end-to-end encryption between your browser and the external provider because the ModelWise backend must read and forward the request.

## Accounts and sync

- ModelWise has no account or cloud-sync flow.
- Sessions and preferences remain in the current browser's IndexedDB.
- Session export/import provides manual backup and transfer.

## Operator responsibilities

If you deploy ModelWise for others:

- Use **HTTPS** on frontend and backend.
- Set **`CORS_ORIGINS`** to your exact frontend origin(s).
- Do not log request headers containing API keys.
- Add a link to this page from your deployed instance if you serve public users.

## Questions and reports

Use [SUPPORT.md](../SUPPORT.md) for general questions. Report vulnerabilities through the private process in [SECURITY.md](../SECURITY.md), not through a public issue.
