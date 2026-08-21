# Phase 4.26 — Authorization Middleware & Request Gate

This phase introduces a small fail-closed middleware boundary above the PostgreSQL authorization repository.

## Guarantees
- validates the request method
- delegates request-to-authorization mapping to an explicit resolver
- requires authenticated request context fields
- converts DENY to HTTP 403 semantics
- converts malformed authentication context to HTTP 401
- converts authorization infrastructure failure to HTTP 503
- never grants access when the authorization layer is unavailable
- provides an explicit deny-all default middleware

## Compatibility
No existing meeting HTML UI, recording, transcript, AI analysis, history, document, revision, or template state is modified.

## Runtime gate
This phase defines the middleware boundary only. It does not automatically intercept existing browser routes or switch production authorization on.

## Self-test
Run:

```bash
node server/security/authorization-middleware.self-test.mjs
```

Expected output:

```text
Phase 4.26 self-test: PASS
```
