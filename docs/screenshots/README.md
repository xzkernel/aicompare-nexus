# Screenshots

README assets captured from the live dev UI.

## Regenerate

With backend (`:8001`) and frontend (`:8080`) running:

```bash
npm run screenshots
# or: node scripts/capture-screenshots.mjs
```

Optional base URL:

```bash
MW_BASE_URL=http://127.0.0.1:8080 npm run screenshots
```

## Files

| File | Route | Notes |
|------|-------|-------|
| `playground.png` | `/playground` | Workbench + model slots |
| `dashboard.png` | `/dashboard` | Registry metadata table |
| `settings.png` | `/settings` | BYOK provider keys |
| `registry.png` | `/playground` | Model picker open |

No API keys are shown in captures. Uses frontier catalog models only.
