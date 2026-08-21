# PHASE 4.24 — PostgreSQL Repository Implementation

## Scope

This phase implements the Phase 4.22 security repository contract against PostgreSQL, without enabling production authorization or changing the existing HTML application.

Implemented operations:

- createSession / getSessionById / getActiveSessionByTokenHash
- rotateSession / revokeSession / expireSessions
- createShare / getShareById / listSharesForResource / revokeShare
- addShareRecipient / listShareRecipients / revokeShareRecipient
- appendTokenEvent / appendRevocation / appendAuthorizationAudit
- authorizeResourceAccess

## Security invariants

1. Raw bearer tokens are accepted only at the session-creation/rotation boundary and are immediately SHA-256 hashed; persistence and lookup use hashes.
2. Active-session lookup requires `status = ACTIVE` and `expires_at > now()`.
3. Share and recipient expiry/revocation are checked during authorization.
4. Owner access is treated as `MANAGE` for the resource owner.
5. Permission checks use an explicit rank: VIEW < COMMENT < DOWNLOAD < EDIT < MANAGE.
6. Revocation mutations and their event/history records are committed atomically.
7. Authorization decisions can append an audit record in the same database connection.
8. SQL uses PostgreSQL parameters for user-controlled values.
9. Existing `authorization_audit` and `revocation_records` append-only triggers remain authoritative.

## Important boundary

This repository is an infrastructure layer only. It is not wired into the browser application's production authorization path in this phase.

## Runtime test gate

Integration tests require `DATABASE_URL` pointing to an isolated PostgreSQL test database. They must run migrations first and clean their own test rows. No production database should be used.
