# Phase 4.32 — Controlled Endpoint Pilot

Introduces the first endpoint-shaped pilot behind the existing security infrastructure without modifying the existing HTML application or activating a production route.

## Pilot contract

```text
GET
MEETING
VIEW
READ
resourceId = meetingId
```

## Safety boundary

The pilot is exposed as a reusable route factory. It is not mounted by `server/index.mjs` in this phase.

Activation remains subject to the Phase 4.31 fail-closed gate and the live PostgreSQL integration gate from Phase 4.25.

## Required behavior

- disabled activation never executes the handler;
- enabled activation requires all Phase 4.31 conditions;
- authentication is resolved before authorization;
- authorization input is built from the server-side contract;
- denied requests never reach the handler;
- successful requests reach only the supplied handler.

## Test

```bash
node server/security/controlled-endpoint-pilot.self-test.mjs
```

This phase deliberately proves the integration seam before any real meeting endpoint is mounted.
