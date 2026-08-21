# PHASE 4.17 — Concrete Server Persistence

## Objective
Turn the Phase 4.16 persistence contract into a concrete repository layer without coupling the existing meeting/document UI to a database driver.

## Boundary
- Security persistence only: sessions, shares, recipients, token events, revocations, authorization audit.
- Existing meeting, transcript, analysis, document, revision, template, pack and delivery models remain untouched.
- Repository methods are the only persistence boundary consumed by authorization services.
- Raw bearer tokens, API keys and passwords are rejected at the persistence boundary.

## Repository interfaces

```text
SessionRepository
ShareRepository
RecipientRepository
TokenEventRepository
RevocationRepository
AuthorizationAuditRepository
```

Each repository exposes create/find/update/revoke operations with explicit input validation.

## Persistence implementation
The phase includes a deterministic in-memory reference implementation suitable for unit tests and adapter development. It is intentionally not presented as production storage. A future PostgreSQL/SQL adapter must satisfy the same repository contract.

## Invariants
1. IDs are opaque strings.
2. Session token material is represented only by tokenHash.
3. Revoked/expired records cannot be reactivated by ordinary update methods.
4. Authorization audit entries are append-only.
5. Unknown permissions/statuses are rejected.
6. Expiry is evaluated using server time supplied to the repository/service.
7. Repository methods return copies so callers cannot mutate stored state by reference.

## Migration path
```text
Reference repository
      ↓
Contract tests
      ↓
SQL adapter
      ↓
Controlled dual-read/write
      ↓
Server authority
```

## Definition of done
- [x] Concrete repository boundary defined.
- [x] Reference implementation provided.
- [x] Secret persistence rejected.
- [x] Revocation monotonicity enforced.
- [x] Audit append-only semantics defined.
- [x] Existing domain model untouched.
- [ ] Production SQL adapter deferred to infrastructure phase.
