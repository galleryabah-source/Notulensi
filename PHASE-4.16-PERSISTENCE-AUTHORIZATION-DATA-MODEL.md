# PHASE 4.16 — Persistence & Authorization Data Model

## Purpose

Define the server-side persistence contract for secure sharing and authorization without changing the existing meeting, transcript, analysis, document, revision, template, or delivery domains.

This phase is a **data-model contract**, not a database migration. It deliberately separates durable security state from the existing client-side application state so the later backend implementation can be introduced incrementally.

## Non-breaking boundary

Existing domains remain opaque and unchanged:

- meeting history
- transcript
- AI analysis
- document generation
- document revisions
- templates
- document packs
- share governance
- delivery state

Phase 4.16 only defines persistence for security and authorization concerns.

## Core entities

### 1. share_records

Represents a durable share authorization record.

```text
id
share_id
resource_type
resource_id
owner_user_id
status
permission
created_at
expires_at
revoked_at
created_by
revoked_by
metadata_json
```

Rules:

- `share_id` is externally safe and unique.
- `resource_type` is allow-listed; it must not become an arbitrary database table name.
- `resource_id` identifies an existing domain object but is not redefined by this phase.
- `status`: ACTIVE | REVOKED | EXPIRED.
- expiry is enforced server-side.
- revoke is durable and auditable.

### 2. share_recipients

Represents recipient-specific authorization attached to a share.

```text
id
share_id
recipient_type
recipient_key
permission
created_at
expires_at
revoked_at
metadata_json
```

`recipient_key` is an opaque normalized identifier. It must not store secrets or bearer tokens.

Recommended recipient types:

```text
USER
EMAIL
LINK
ORGANIZATION
```

### 3. auth_sessions

Represents authenticated server sessions.

```text
id
session_id
user_id
token_hash
status
created_at
last_seen_at
expires_at
revoked_at
rotated_from_session_id
ip_hash
user_agent_hash
```

Security rules:

- store only a one-way token hash, never a raw bearer token;
- session lookup is server-side;
- expired/revoked sessions fail closed;
- rotation creates a new session record and invalidates the previous session when policy requires it;
- IP and user-agent values are optional privacy-preserving hashes, not raw PII by default.

### 4. token_events

Tracks token lifecycle events without persisting token material.

```text
id
session_id
event_type
created_at
request_id
metadata_json
```

Event types:

```text
ISSUED
ROTATED
REVOKED
EXPIRED
REJECTED
```

### 5. authorization_audit

Immutable audit trail for protected operations.

```text
id
request_id
actor_user_id
session_id
operation
resource_type
resource_id
decision
reason_code
created_at
metadata_json
```

Decisions:

```text
ALLOW
DENY
```

Recommended reason codes:

```text
UNAUTHENTICATED
SESSION_EXPIRED
SESSION_REVOKED
RESOURCE_NOT_FOUND
SHARE_NOT_FOUND
SHARE_REVOKED
SHARE_EXPIRED
RECIPIENT_MISMATCH
PERMISSION_DENIED
INVALID_REQUEST
RATE_LIMITED
```

### 6. revocation_records

Provides an explicit durable revocation boundary for sessions, shares, and future credential classes.

```text
id
subject_type
subject_id
reason
revoked_at
revoked_by
request_id
```

Subject types:

```text
SESSION
SHARE
RECIPIENT
```

## Relationships

```text
USER
 │
 ├── auth_sessions
 │       │
 │       └── token_events
 │
 └── share_records
         │
         ├── share_recipients
         │
         └── revocation_records

PROTECTED REQUEST
       │
       ├── auth_sessions
       ├── share_records
       └── authorization_audit
```

## Authorization evaluation order

Every protected request should follow this order:

```text
1. Parse request
       ↓
2. Validate request schema
       ↓
3. Authenticate session
       ↓
4. Check session status + expiry + revocation
       ↓
5. Resolve resource/share
       ↓
6. Check share status + expiry + revocation
       ↓
7. Resolve recipient context
       ↓
8. Evaluate permission
       ↓
9. Write authorization audit
       ↓
10. Execute operation
```

The order is intentional. Application code must not perform the protected operation before authorization has completed.

## Permission model

Keep the permission vocabulary small and explicit:

```text
VIEW
COMMENT
DOWNLOAD
EDIT
MANAGE
```

Permission checks must use a server-side allow-list. Unknown permissions are denied.

## Integrity constraints

The eventual database implementation should enforce:

- unique `share_id`;
- unique active session identifier;
- non-null ownership for owned shares;
- valid enum/status values;
- foreign-key integrity where domain identifiers exist in the server schema;
- indexes on `share_id`, `session_id`, `token_hash`, `resource_type + resource_id`, `expires_at`, and `request_id`;
- immutable audit rows;
- no raw tokens in persistence;
- no client-controlled authorization decision.

## Expiry semantics

Expiry is authoritative on the server.

```text
expires_at <= now
        ↓
EXPIRED
        ↓
DENY
```

A client-visible status is informational only and cannot override server expiry.

## Revocation semantics

Revocation is monotonic:

```text
ACTIVE → REVOKED
ACTIVE → EXPIRED
```

A revoked or expired authorization must never return to ACTIVE through an ordinary update operation.

If a new authorization is required, create a new share/session record.

## Privacy rules

Never persist:

- raw bearer tokens;
- API keys;
- provider secrets;
- passwords;
- full authorization headers;
- unnecessary raw IP addresses;
- unnecessary raw user-agent strings.

Sensitive operational metadata should be minimized, hashed, or redacted according to retention policy.

## Migration strategy

Phase 4.16 does not require changing the current HTML application's storage immediately.

Migration path:

```text
Existing local state
       ↓
Phase 4.15 integration boundary
       ↓
Phase 4.16 server persistence contract
       ↓
Dual-read / controlled write
       ↓
Server becomes authority
       ↓
Legacy security state retired
```

Meeting/document data migration remains a separate concern.

## Definition of done

- [x] Security entities defined.
- [x] Session token hashing contract defined.
- [x] Share and recipient persistence separated.
- [x] Revocation modeled explicitly.
- [x] Audit model defined.
- [x] Expiry semantics defined.
- [x] Permission vocabulary defined.
- [x] Authorization evaluation order defined.
- [x] No raw secret persistence allowed by contract.
- [x] Existing domain model remains untouched.
- [ ] Concrete database migration — future phase.
- [ ] Production repository implementation — future phase.
