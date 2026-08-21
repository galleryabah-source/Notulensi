# Phase 4.30 — Security Integration Regression

This phase is the cross-layer regression gate for the protected request path introduced by Phases 4.26–4.29.

## Covered path

```text
Request
  -> Authenticated Context
  -> Endpoint Contract
  -> Authorization Input
  -> Authorization Decision
  -> Protected Handler
```

## Required behavior

- authenticated and authorized request reaches the handler;
- denied request returns 403 and never reaches the handler;
- authentication failure returns 401 and stops the pipeline;
- invalid method/request returns 400 before authorization;
- missing resource ID returns 400 before authorization;
- authorization input uses server-declared permission/operation values;
- handler execution count is observable in tests;
- no existing browser/meeting state is mutated by the security layer.

## Self-test

```bash
node server/security/security-integration-regression.self-test.mjs
```

## Production gate

This regression suite is necessary but not sufficient for production activation. The live Phase 4.25 PostgreSQL integration suite must also pass against an isolated PostgreSQL database. Endpoint-specific tests must be added before each real route is protected.

## Blueprint alignment

This phase implements the blueprint principle:

```text
Preserve -> Stabilize -> Enhance -> Modularize -> Scale
```

No rewrite of the existing HTML application is introduced.
