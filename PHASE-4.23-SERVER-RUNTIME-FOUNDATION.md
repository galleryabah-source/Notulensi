# PHASE 4.23 — Server Runtime Foundation

## Objective

Create the smallest real server/runtime boundary required for the Phase 4.22 repository contract and Phase 4.21 PostgreSQL schema to become executable without changing the existing HTML application.

## Added

- `package.json` — Node ESM runtime boundary with `pg` dependency.
- `.env.example` — explicit server configuration contract.
- `.gitignore` — protects local environment files and dependencies.
- `server/config.mjs` — validated host/port/database configuration.
- `server/db/client.mjs` — lazy PostgreSQL pool boundary.
- `server/db/migrate.mjs` — transactional migration runner with `schema_migrations` tracking.
- `server/index.mjs` — minimal HTTP runtime with database-backed `/health` check.
- `server/runtime-self-test.mjs` — static/runtime-boundary regression checks.

## Safety boundary

This phase does **not**:

- replace the existing HTML application;
- change meeting, recording, transcript, AI, document, revision, template, or history behavior;
- enable server-side authorization as production authority;
- expose security repositories as public API routes;
- store raw bearer tokens or secrets;
- require an existing production database to boot the current HTML application.

The new server runtime is intentionally isolated and opt-in.

## Database behavior

`npm run db:migrate` applies the existing canonical security migration from Phase 4.21 to an explicitly configured `DATABASE_URL`.

The runner:

1. opens a PostgreSQL connection;
2. creates `schema_migrations` if absent;
3. checks whether migration `00421_security_authorization` already exists;
4. executes the migration inside one transaction when needed;
5. records the migration only after success;
6. rolls back on failure;
7. closes the pool.

The migration's outer `BEGIN`/`COMMIT` markers are removed before execution so the runner owns the transaction boundary. SQL function bodies and trigger statements are intentionally sent to PostgreSQL as one query rather than split on semicolons.

## Health endpoint

`GET /health` performs `SELECT 1` against PostgreSQL.

Success:

```json
{"ok":true,"service":"meeting-intelligence-runtime","database":"ok"}
```

Database failure returns HTTP 503 without exposing database error details.

## Execution gates

### Gate A — Static/runtime boundary

```text
npm install
npm run runtime:self-test
```

Must pass before integration work continues.

### Gate B — Isolated PostgreSQL

```text
DATABASE_URL=<isolated-test-db>
npm run db:migrate
```

Must be executed against an isolated database before any authorization repository is wired to production behavior.

### Gate C — Integration

Only after Gate B succeeds should Phase 4.22 repository methods receive a concrete PostgreSQL implementation and integration tests.

## Rollout sequence

```text
HTML application
      │
      ├── remains unchanged
      │
      ▼
Phase 4.23 runtime
      │
      ├── /health
      └── migration runner
              │
              ▼
      isolated PostgreSQL
              │
              ▼
Phase 4.22 repository implementation
              │
              ▼
controlled authorization integration
```

## Definition of done

- [x] Real Node server runtime boundary exists.
- [x] PostgreSQL dependency is explicitly declared.
- [x] Environment boundary exists without committing secrets.
- [x] Connection pool boundary exists.
- [x] Migration runner is transactional and idempotent.
- [x] Health endpoint exists without exposing DB internals.
- [x] Self-test exists.
- [x] Existing client domain remains untouched.
- [ ] `npm install` executed in a real checkout.
- [ ] Self-test executed in a real checkout.
- [ ] Migration executed against an isolated PostgreSQL instance.
- [ ] PostgreSQL schema verification completed.
- [ ] Phase 4.22 repository implementation wired to PostgreSQL.
- [ ] Browser + integration + CI matrix completed.

## Next phase

**PHASE 4.24 — PostgreSQL Repository Implementation & Integration Test Harness**

The next phase must implement the Phase 4.22 contract against the Phase 4.21 schema, but remain behind the server boundary until isolated integration tests prove session, share, recipient, token-event, revocation, audit, and authorization-decision invariants.
