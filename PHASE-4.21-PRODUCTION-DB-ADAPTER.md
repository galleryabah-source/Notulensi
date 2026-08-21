# PHASE 4.21 — Production Database Adapter

## Purpose

Introduce a production PostgreSQL persistence boundary for the security/authorization entities defined in Phase 4.16 and exercised by Phases 4.17–4.20.

This phase is deliberately additive. It does **not** migrate or rewrite meeting, transcript, analysis, document, revision, template, document-pack, or delivery state.

## Important repository finding

The current repository is still a public HTML-first application and does not expose a production server/database package (`package.json` was not present at the Phase 4.20 branch root). Therefore this phase provides the production database contract and migration artifact, not an invented runtime adapter wired into a nonexistent backend.

## Persistence scope

Only these security entities are introduced:

- `auth_sessions`
- `share_records`
- `share_recipients`
- `token_events`
- `revocation_records`
- `authorization_audit`

## Non-breaking rule

The existing client application remains authoritative for existing meeting/document behavior until a real backend integration phase explicitly introduces server authority.

No existing localStorage keys, meeting history fields, document revision fields, or UI controls are removed.

## Database requirements

The PostgreSQL migration must enforce:

1. UUID primary keys for durable rows.
2. Unique external `session_id` and `share_id`.
3. Unique token hashes where present.
4. Explicit status/permission/type checks.
5. Server-side expiry timestamps.
6. Durable monotonic revocation.
7. Foreign-key relationships between shares and recipients.
8. Append-only authorization audit rows.
9. No raw bearer tokens or secrets.
10. Indexes for authorization lookup paths.

## Transaction boundaries

Security-sensitive mutations must be transactional:

```text
BEGIN
  mutate security state
  append revocation/event/audit record
COMMIT
```

If any required mutation fails, the transaction must roll back. A caller must never observe a successful revocation without its corresponding revocation record.

## Migration

The canonical SQL artifact is:

`db/migrations/00421_security_authorization.sql`

It is intentionally independent of the current HTML UI. A later server implementation can execute it through its migration runner.

## Rollout strategy

```text
Phase 4.20 regression baseline
        ↓
Apply SQL migration to isolated database
        ↓
Run schema verification
        ↓
Run repository contract tests
        ↓
Deploy behind feature flag
        ↓
Dual-read / controlled-write
        ↓
Server authority
```

Do not switch production authorization to the database merely because the migration exists.

## Definition of done

- [x] Production PostgreSQL schema defined.
- [x] Security constraints defined at database level.
- [x] Authorization lookup indexes defined.
- [x] Append-only audit protection defined.
- [x] Raw secret persistence rejected by schema contract.
- [x] Existing application domain untouched.
- [ ] Execute against an actual production-like PostgreSQL instance.
- [ ] Implement runtime repository adapter after server runtime exists.
- [ ] Wire authorization middleware to the runtime adapter.
- [ ] Run browser + integration + CI matrix.
