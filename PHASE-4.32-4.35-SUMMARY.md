# Phases 4.32–4.35 — Controlled Security Integration Bundle

## 4.32 Controlled Endpoint Pilot
A server-side meeting-read pilot contract is defined but not mounted in production.

## 4.33 Protected Route Registry
Protected routes can only be registered after the fail-closed activation gate succeeds. Duplicate route names are rejected.

## 4.34 Security Audit Observability
Protected-route decisions have a normalized, privacy-bounded audit event representation. Secrets, headers, transcripts, documents, and request bodies are excluded.

## 4.35 Pre-Activation Regression Gate
One command runs the accumulated security self-tests before any future endpoint activation.

## Current production boundary

```text
Existing HTML application
        |
        +---- unchanged

Security runtime
        |
        +---- built and tested
        +---- protected routes NOT mounted
        +---- live PostgreSQL gate still required
```

The bundle is intentionally additive and does not activate authorization on existing production routes.
