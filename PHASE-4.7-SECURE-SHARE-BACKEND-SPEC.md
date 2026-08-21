# PHASE 4.7 — Secure Share Backend Specification & Data Model

Status: **Contract / implementation-ready specification**

Phase 4.7 continues Phase 4.6 additively. It does not replace the existing browser sharing, document revision, document pack, export, or cloud-distribution behavior.

## 1. Objective

Define the production backend boundary for secure document sharing before implementing a real cloud service.

The browser remains responsible for requesting a share and rendering a shared document. The backend is authoritative for identity, authorization, token validation, expiration, revocation, rate limiting, and audit persistence.

## 2. Core data model

### users

| Field | Purpose |
|---|---|
| id | Stable user identifier |
| email | Login/identity reference |
| status | active, suspended, deleted |
| createdAt | Account creation timestamp |

### documents

| Field | Purpose |
|---|---|
| id | Permanent document ID |
| ownerId | User who owns the document |
| sourceMeetingId | Meeting source |
| currentRevisionId | Current revision pointer |
| createdAt | Creation timestamp |
| updatedAt | Last update timestamp |

### document_revisions

| Field | Purpose |
|---|---|
| id | Revision ID |
| documentId | Parent document |
| revisionNumber | Monotonic revision number |
| contentHash | Deterministic content fingerprint |
| content | Revision content or secure content reference |
| createdAt | Revision timestamp |

### document_shares

| Field | Purpose |
|---|---|
| id | Share ID |
| documentId | Shared document |
| revisionId | Immutable shared revision |
| ownerId | Share owner |
| tokenHash | Server-side hash; never raw token |
| visibility | private / unlisted / public |
| expiresAt | Hard expiration |
| revokedAt | Revocation timestamp, nullable |
| policy | Access policy JSON |
| createdAt | Creation timestamp |
| updatedAt | Last policy/state update |

### share_access_logs

| Field | Purpose |
|---|---|
| id | Audit event ID |
| shareId | Related share |
| event | created / resolved / denied / revoked / expired / rotated |
| actorId | Authenticated actor when available |
| ipHash | Privacy-preserving client address fingerprint |
| userAgentHash | Privacy-preserving client fingerprint |
| metadata | Non-sensitive event metadata |
| occurredAt | Event timestamp |

## 3. API contract

### POST `/api/shares`

Creates a share for an immutable document revision.

Request must contain:

- documentId
- revisionId
- visibility
- expiration policy
- access policy

Response may return a raw access token **once** to the authorized creator. The raw token must never be persisted by the server.

### GET `/api/shares/:shareId`

Resolves an active share.

Server checks, in order:

1. share exists;
2. share is not revoked;
3. share has not expired;
4. token is valid when required;
5. ACL/visibility permits access;
6. rate limit permits access.

A successful resolution creates an audit event.

### DELETE `/api/shares/:shareId`

Revokes a share. The operation is idempotent and records a revocation audit event.

### POST `/api/shares/:shareId/rotate`

Invalidates the current token and issues a replacement token under the same share policy. Rotation must preserve the immutable document/revision relationship.

### GET `/api/shares`

Lists shares visible to the authenticated owner or organization administrator. Raw tokens are never returned.

### GET `/api/shares/:shareId/audit`

Returns authorized audit events. Sensitive network identifiers must remain hashed or redacted.

## 4. Access policy

Recommended defaults:

```json
{
  "visibility": "unlisted",
  "allowAnonymousRead": true,
  "allowIndexing": false,
  "allowDownload": true,
  "ttlMinutes": 1440,
  "maxAccessPerMinute": 30
}
```

Default visibility remains **unlisted**. Public indexing is opt-in and should be disabled by default.

## 5. Security boundary

The production server MUST enforce:

- authentication for owner/admin operations;
- authorization and document ownership checks;
- token generation using cryptographically secure randomness;
- one-way token hashing at rest;
- constant-time token comparison where applicable;
- expiration and revocation;
- rate limiting and abuse protection;
- audit persistence;
- CSRF/origin protection where cookie authentication is used;
- strict input validation;
- output encoding / XSS protection;
- security headers;
- secret management outside source control;
- HTTPS in production.

The browser must not contain API secrets, database credentials, signing keys, or privileged authorization credentials.

## 6. Traceability

A share must point to a specific immutable revision:

```text
Share
  -> Document ID
      -> Revision ID
          -> Content Hash
              -> Meeting Source
                  -> Transcript Hash
                  -> Analysis Hash
```

Therefore a later document revision does not silently mutate an existing shared document. A new share or explicit revision update is required.

## 7. Lifecycle

```text
CREATE
  ↓
ACTIVE
  ├── RESOLVE → AUDIT
  ├── ROTATE → NEW TOKEN → AUDIT
  ├── REVOKE → REVOKED → AUDIT
  └── EXPIRE → EXPIRED → AUDIT
```

## 8. Backward compatibility

Phase 4.7 does not remove Phase 4.5 local/browser sharing or Phase 4.6 local-mock mode. Production backend integration should be enabled only through the explicit remote adapter already defined by Phase 4.6.

## 9. Definition of Done

- [x] Data model defined
- [x] API endpoints defined
- [x] Security boundary defined
- [x] Revision traceability defined
- [x] Share lifecycle defined
- [x] Audit event model defined
- [x] Client self-test contract added
- [ ] Production authentication implementation
- [ ] Production database migration
- [ ] Production API implementation
- [ ] Integration/E2E security testing

Phase 4.7 is therefore complete as a **backend contract/specification phase**, but it must not be described as a production cloud backend until the remaining implementation items are completed.
