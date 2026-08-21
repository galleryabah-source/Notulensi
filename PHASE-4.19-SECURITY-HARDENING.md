# PHASE 4.19 — Security Hardening

## Objective
Harden the server boundary before production integration. This phase adds deterministic request protections without changing the existing meeting/document UI.

## Controls
1. Secret redaction: never log bearer tokens, API keys, passwords or authorization headers.
2. Request identity: every protected request receives a request ID.
3. Rate limiting: bounded attempts per identity/window with fail-closed behavior on invalid configuration.
4. Origin policy: mutating browser requests require an approved origin when origin checking is enabled.
5. Input limits: request/body identifiers and metadata have explicit maximum sizes.
6. Audit normalization: audit metadata is sanitized before persistence.
7. Timing-safe token comparison is delegated to the server adapter; plaintext token comparison is prohibited.

## Rate-limit model
```text
key = authenticated user OR session OR normalized network bucket
window = fixed server-side interval
limit = explicit policy
```
The limiter is a defense-in-depth control, not an authorization mechanism.

## Privacy
Network identifiers should be hashed or bucketed. Raw authorization headers and bearer material are never retained in audit metadata.

## Definition of done
- [x] Request IDs generated deterministically when absent.
- [x] Secret redaction helper provided.
- [x] Rate limiter provided with reset semantics.
- [x] Origin validation provided.
- [x] Input-size validation provided.
- [x] Security self-test provided.
- [x] No existing meeting/document mutation introduced.
