# Phase 4.31 — Controlled Security Activation

Introduces a fail-closed activation gate for protected routes without enabling them automatically.

## Activation requires all three conditions

```text
ENABLE_PROTECTED_ROUTES = true
        AND
Live PostgreSQL integration = VERIFIED
        AND
Endpoint regression = VERIFIED
```

Otherwise activation remains disabled.

## Important

This phase does not wire the switch into existing production routes. It creates the explicit gate that a later endpoint integration must call before enabling authorization.

The default behavior remains:

```text
ENABLE_PROTECTED_ROUTES absent/false
        -> disabled
```

## Why this matters

A deployment must never become protected or unprotected accidentally because of a missing environment variable, a failed database check, or an incomplete regression run.

## Self-test

```bash
node server/security/activation-gate.self-test.mjs
```

## Blueprint alignment

This is the controlled transition from `Stabilize` to `Integrate`. It does not alter the existing meeting application and preserves backward compatibility until explicit production adoption is reviewed.
