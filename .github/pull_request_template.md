## Summary

Describe the problem and the smallest change that solves it.

## Verification

List the commands or manual checks you ran and their results.

## Checklist

- [ ] The change is focused and does not include unrelated cleanup.
- [ ] I updated documentation for changed behavior, API contracts, or configuration.
- [ ] I did not commit credentials, environment files, sensitive prompts, or generated build artifacts.
- [ ] I ran applicable frontend checks: `npm run lint`, `npm run typecheck`, `npm run build`, and `npm exec -- playwright test --config=scripts/playwright.config.mjs`.
- [ ] I ran backend tests from `backend/` with `python -m pytest`, or explained why they do not apply.
- [ ] I added screenshots for a material UI change, or marked them not applicable.
