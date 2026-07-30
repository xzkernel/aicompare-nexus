# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

ModelWise is a BYOK (Bring Your Own Key) platform. Active keys are memory-only by default, but they transit the configured ModelWise backend in request headers so it can call external providers. The backend does not intentionally persist provider keys.

Optional password-protected vault and export features encrypt keys in the browser. Prompts and model responses transit the backend and external providers and are not end-to-end encrypted from the browser to the provider.

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, report them via:

- Email: **security@modelwise.ai** (preferred)
- GitHub Security Advisory: [Private vulnerability reporting](https://github.com/Archiixyz/aicompare-nexus/security/advisories/new)

### What to include

- A clear description of the vulnerability
- Steps to reproduce
- Impact and potential exploit scenario
- Suggested fix (if available)

### Response timeline

- Initial acknowledgment: **within 48 hours**
- Status update: **within 5 business days**
- Resolution or mitigation: **within 30 days** (depending on severity)

### Disclosure policy

- We follow coordinated disclosure
- Credit will be given in the changelog and advisory
- We request a 90-day embargo before public disclosure

## Scope

- The FastAPI backend (`/api/*`, `/health`)
- The React frontend (Vite SPA)
- Docker and deployment configurations
- Documentation that could lead to insecure setups

### Out of scope

- Issues requiring physical access to a self-hosted instance
- Social engineering attacks
- Denial of service against self-hosted instances
