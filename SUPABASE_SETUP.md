# Supabase Setup (Optional)

ModelWise does **not** require Supabase. Compare, streaming, and BYOK work fully offline and without login.

Supabase is only used for **optional** OAuth sign-in and **optional** cloud backup of comparison sessions.

See the authoritative guide: **[docs/CLOUD_SYNC.md](./docs/CLOUD_SYNC.md)**

## Quick setup

1. Create a [Supabase](https://supabase.com) project.
2. Run `supabase/migrations/001_cloud_sync.sql` in the SQL editor.
3. Enable **GitHub** and **Google** in Authentication → Providers.
4. Add redirect URLs in Supabase → Authentication → URL Configuration:
   - `http://localhost:8080/auth/callback`
   - `http://127.0.0.1:8080/auth/callback`
   - (plus your production origin + `/auth/callback`)
5. Set frontend env vars:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

6. Restart the Vite dev server.

## What is NOT stored in Supabase

- Provider API keys (BYOK) — browser only
- Inference requests — FastAPI backend, keys forwarded per request
- Compare execution — never gated on auth

## Legacy note

Older docs referenced backend JWT auth (`/api/v1/me`, email/password). That path was removed. Auth is **client-side Supabase OAuth only**.
