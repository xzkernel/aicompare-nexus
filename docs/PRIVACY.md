# Privacy

ModelWise is a **local-first, BYOK (Bring Your Own Key)** evaluation workbench.

## What stays on your device

| Data | Storage | Synced? |
|------|---------|---------|
| Provider API keys | Browser (memory / local storage) | **Never** |
| Comparison sessions | IndexedDB | Only if you enable optional cloud sync |
| Preferences (theme, locale) | IndexedDB | Only if optional cloud sync is enabled |
| Prompts / profiles | IndexedDB | Only if optional cloud sync is enabled |

## What leaves your browser

When you run a compare:

1. Your **prompt** and **model selection** are sent to the ModelWise backend you configure (self-hosted, Railway, etc.).
2. Your **provider API keys** are sent as **HTTP headers** on those requests so the backend can forward to OpenAI, Google, Anthropic, or other providers.
3. The backend **does not persist** your API keys.

Model responses stream back over SSE and are shown in the UI. They may be saved locally as session history in IndexedDB.

## Accounts & cloud sync (optional)

- **No account is required** to use compare, settings, or local sessions.
- If the operator enables **Supabase** (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`), you may optionally sign in with GitHub or Google to back up sessions across devices.
- Provider API keys are **never** included in cloud sync.

## Operator responsibilities

If you deploy ModelWise for others:

- Use **HTTPS** on frontend and backend.
- Set **`CORS_ORIGINS`** to your exact frontend origin(s).
- Do not log request headers containing API keys.
- Add a link to this page from your deployed instance if you serve public users.

## Contact

For the official repository, open an issue at [github.com/Archiixyz/aicompare-nexus](https://github.com/Archiixyz/aicompare-nexus).
