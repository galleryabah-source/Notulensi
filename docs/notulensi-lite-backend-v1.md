# Notulensi Lite — Backend V1

## Purpose
Provide a safe persistence path for the Lite interface while preserving the existing database schema and the single Admin control plane.

## Current boundary
- Authentication: existing `notulensi_admin_session` admin session.
- Persistence: existing `public.app_storage` JSONB table; no new table is created.
- Scope key: derived from the authenticated admin email and prefixed with `notulensi:lite:v1:`.
- Concurrency: integer optimistic versioning with `SELECT ... FOR UPDATE`.
- Payload cap: 512 KB.
- Record cap: 200 meetings + 200 transcripts.
- SQL: parameterized queries only.
- Transport: same-origin credentials; write requests additionally require `X-Notulensi-Lite-Request: 1` to force a non-simple CORS request boundary.
- Cache: `no-store`.
- AI: completely outside the Lite backend path.

## Important limitation
The first shared backend path is intentionally **admin-scoped** because the existing production repository exposes a mature admin session boundary but does not expose a verified end-user session contract in the current deployable API set. This avoids inventing a second authentication system.

The next backend stage is to bind Lite data to the existing end-user identity provider/authorization contract, after that contract is verified. Until then, the browser local adapter remains the fallback for non-admin users.

## Failure behavior
- Missing/expired admin session: 401.
- Missing Lite write header: 403.
- Concurrent version mismatch: 409 with current server state.
- Storage/DB unavailable: 503; client keeps local data.
- Payload too large: rejected by backend validation.

## No migration policy
This implementation deliberately does not execute DDL, migrations, `db:push`, or runtime table creation. It reuses the already-audited `app_storage` table only.
