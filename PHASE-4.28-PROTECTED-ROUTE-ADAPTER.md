# Phase 4.28 — Protected Route Adapter

Introduces the final additive boundary needed before individual server endpoints can opt into authorization.

## Flow

```text
HTTP Request
  -> Request Context
  -> Resource Authorization Input
  -> Authorization Middleware
  -> Protected Handler
```

## Safety
- existing unprotected routes are untouched
- no global middleware switch is enabled
- protected handler is never invoked after authentication/authorization failure
- authentication failure returns 401
- authorization denial returns the middleware's 403/503 result
- route-specific resource mapping remains explicit

## Activation rule
Production route adoption must happen only after the Phase 4.25 PostgreSQL integration gate passes and the protected endpoint itself has a regression test.

## Self-test
```bash
node server/security/protected-route.self-test.mjs
```
