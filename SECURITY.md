# Security Policy

## Supported Versions

ModelWise has not published a tagged release. Security fixes are applied to the default branch on a best-effort basis; no numbered version currently receives a separate support commitment.

## Reporting a Vulnerability

ModelWise is a BYOK (Bring Your Own Key) platform. Active keys are memory-only by default, but they transit the configured ModelWise backend in request headers so it can call external providers. The backend does not intentionally persist provider keys.

Optional password-protected vault and export features encrypt keys in the browser. Prompts and model responses transit the backend and external providers and are not end-to-end encrypted from the browser to the provider.

**Please do not report security vulnerabilities through public GitHub issues.**

Use GitHub's [private vulnerability reporting](https://github.com/xzkernel/aicompare-nexus/security/advisories/new) to send the maintainers a private report.

### What to include

- A clear description of the vulnerability
- Steps to reproduce
- Impact and potential exploit scenario
- Suggested fix (if available)

### Disclosure policy

- Allow the maintainers time to investigate and prepare a fix before public disclosure.
- Coordinate disclosure timing through the private report.
- State whether you want public credit; credit is subject to mutual agreement.

## Scope

- The FastAPI backend (`/api/*`, `/health`)
- The React frontend (Vite SPA)
- Docker and deployment configurations
- Documentation that could lead to insecure setups

### Out of scope

- Issues requiring physical access to a self-hosted instance
- Social engineering attacks
- Denial of service against self-hosted instances
