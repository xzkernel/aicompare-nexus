# Cloud Sync (Optional)

ModelWise is **local-first**. Cloud sync is an optional enhancement for multi-device backup — not required for compare, streaming, or BYOK.

## Architecture

```
UI → IndexedDB (primary) → sync queue → Supabase (optional)
```

- **No backend sync API** — the browser talks to Supabase directly with the anon key + RLS.
- **API keys never sync** — they stay in memory or encrypted device vault only.
- **Compare/stream** never checks auth.

## Setup

1. Create a Supabase project.
2. Run [`supabase/migrations/001_cloud_sync.sql`](../supabase/migrations/001_cloud_sync.sql) in the SQL editor.
3. Enable **GitHub** and **Google** providers in Supabase Auth.
4. Add redirect URLs in Supabase → Authentication → URL Configuration:
   - `http://localhost:8080/auth/callback`
   - `http://127.0.0.1:8080/auth/callback`
   - (production origin + `/auth/callback`)
5. Set frontend env:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## User flow

1. Use ModelWise without signing in (full functionality).
2. Optional: **Sign in to sync** from the shell header.
3. Enable **background sync** in Settings → Cloud.
4. On first sign-in, choose **Upload local history** (never automatic).

## IndexedDB stores

| Store | Purpose |
|-------|---------|
| `comparison_sessions` | Compare history |
| `saved_prompts` | User prompt library |
| `preferences` | Theme + sync toggle |
| `sync_queue` | Pending push operations |
| `metadata` | Device id, last sync times |

## Conflict resolution

1. Newer `updatedAt` wins.
2. On tie, **local wins**.
3. Deletes are **soft** (`deletedAt` tombstone) — no hard delete in v1.

## Sync metadata

Every synced entity carries reconciliation metadata:

```ts
type SyncMetadata = {
  id: string;
  updatedAt: string;      // ISO — last local write
  lastSyncedAt?: string;  // ISO — last successful cloud push
  version: number;        // schema version
  deviceId: string;       // originating device
};
```

IndexedDB stores epoch-ms equivalents (`updatedAt`, `lastSyncedAt`, `schemaVersion`). The sync queue pushes after every local write; background pull merges remote changes without blocking the UI.

## Security

- RLS on all tables — `auth.uid() = user_id`.
- Never put `SUPABASE_SERVICE_ROLE_KEY` in the frontend.
- Logout clears auth session only; local IndexedDB data remains.

## Migration from localStorage

On first IndexedDB open, legacy `modelwise-comparison-sessions` in localStorage is imported once and removed.

See also: [CONTRIBUTING.md](../CONTRIBUTING.md) · [SELF_HOSTING.md](./SELF_HOSTING.md)
