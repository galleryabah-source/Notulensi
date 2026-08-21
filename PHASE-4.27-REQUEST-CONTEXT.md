# Phase 4.27 — Authenticated Request Context

Adds the server boundary that converts an HTTP bearer credential into a short-lived authorization context.

## Rules
- reads `Authorization: Bearer ...`
- hashes the bearer token immediately for repository lookup
- never returns the raw token
- rejects missing, malformed, oversized or inactive credentials
- reuses an incoming `X-Request-Id` when valid, otherwise generates one
- keeps resource/operation fields supplied by the protected route separate from authentication state

## Compatibility
No browser token persistence, existing HTML state, meeting history, transcript, analysis, document revision or template behavior is modified.

## Security boundary
The resolver is server-only infrastructure. It must not be imported into the browser application.

## Self-test
```bash
node server/security/request-context.self-test.mjs
```
