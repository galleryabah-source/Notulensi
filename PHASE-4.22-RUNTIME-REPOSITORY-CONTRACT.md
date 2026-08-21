# PHASE 4.22 — Runtime Repository Contract

## Purpose

Define the exact server-side repository boundary that a future PostgreSQL runtime must implement, without inventing a backend where the repository currently has none.

## Scope

This contract covers only security/authorization persistence introduced in Phase 4.21:

- sessions
- shares
- share recipients
- token events
- revocations
- authorization audit

Existing meeting, transcript, analysis, document, revision, template, history, and client-state behavior remains untouched.

## Repository contract

The runtime adapter must expose these operations:

```text
createSession
getSessionById
getActiveSessionByTokenHash
rotateSession
revokeSession
expireSessions

createShare
getShareById
listSharesForResource
revokeShare

addShareRecipient
listShareRecipients
revokeShareRecipient

appendTokenEvent
appendRevocation
appendAuthorizationAudit

authorizeResourceAccess
```

## Security rules

1. The adapter accepts token hashes, never raw bearer tokens.
2. Authorization decisions are server-side once runtime adoption begins.
3. Revocation and its audit/event record occur in one database transaction.
4. Expired or revoked sessions/shares/recipients must never authorize access.
5. Repository methods return normalized domain objects, not database rows.
6. SQL must remain parameterized; no string-concatenated user input.
7. Audit and revocation records remain append-only.
8. No client-side localStorage value is trusted as server authorization state.

## Transaction contract

Security mutations must use an atomic unit:

```text
BEGIN
  update security state
  append event/revocation/audit
COMMIT
```

On failure:

```text
ROLLBACK
```

The caller must not observe a partial security mutation.

## Compatibility boundary

Until a real server runtime exists, the browser application continues using its existing client behavior. This phase introduces no production authorization switch and no migration of existing meeting data.

## Implementation gate

The next runtime phase is allowed to introduce a concrete PostgreSQL client only when the repository has a server runtime/package with a controlled dependency boundary and a test database.

## Definition of done

- [x] Repository API contract defined.
- [x] Security invariants documented.
- [x] Transaction boundary documented.
- [x] Client compatibility preserved.
- [ ] Concrete PostgreSQL implementation.
- [ ] Integration tests against PostgreSQL.
- [ ] Authorization middleware wiring.
- [ ] CI database matrix.
