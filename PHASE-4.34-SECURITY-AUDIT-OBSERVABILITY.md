# Phase 4.34 — Security Audit Observability

Adds a side-effect-free audit event builder for protected request decisions.

## Recorded fields

- event type
- request ID
- actor user ID
- session ID
- endpoint name
- resource type
- resource ID
- operation
- required permission
- decision
- reason code
- timestamp

## Explicit exclusions

The event builder does not record:

- authentication tokens
- cookies
- API keys
- raw Authorization headers
- transcript content
- document content
- request bodies

## Safety

This phase only creates normalized audit events. It does not change existing persistence or production request routing.

## Test

```bash
node server/security/security-audit-event.self-test.mjs
```
