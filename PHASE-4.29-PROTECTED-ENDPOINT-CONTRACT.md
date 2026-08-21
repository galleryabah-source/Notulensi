# Phase 4.29 — Protected Endpoint Contract

Defines the explicit contract required before a real application endpoint opts into the protected-route adapter.

## Contract

Every protected endpoint declares:

- endpoint name
- HTTP method
- resource type
- required permission
- authorization operation
- request validation
- resource-ID resolver

The endpoint must never infer authorization scope from arbitrary client input.

## Flow

```text
HTTP Request
  -> Endpoint Contract
  -> Request Validation
  -> Resource ID Resolution
  -> Authenticated Context
  -> Authorization Input
  -> Authorization Middleware
  -> Handler
```

## Safety rules

1. Method mismatch is rejected.
2. Missing/invalid request data is rejected before authorization.
3. Missing resource ID is rejected.
4. Permission and operation values come from server-side endpoint configuration.
5. Authorization input is frozen before crossing the middleware boundary.
6. Deny-by-default remains mandatory.
7. Existing HTML/browser routes are not changed by this phase.

## Activation gate

A concrete production endpoint may adopt this contract only after:

- Phase 4.25 live PostgreSQL integration test passes in an isolated database;
- Phase 4.29 self-test passes;
- endpoint-specific regression tests exist;
- the endpoint is explicitly reviewed for resource ownership/scope semantics.

## Self-test

```bash
node server/security/protected-endpoint-contract.self-test.mjs
```
