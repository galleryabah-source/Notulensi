# PHASE 4.9 — Authentication & Accounts

Status: **implementation baseline / identity boundary**

Phase 4.9 strengthens the Phase 4.8 backend without replacing browser/local/mock sharing or document/revision traceability.

## Objectives

- Make authenticated identity authoritative at the database boundary.
- Prevent JWT role claims from granting privileges by themselves.
- Reject malformed/non-UUID subjects.
- Enforce active account status.
- Validate issuer and audience when configured.
- Expose a minimal `/api/account/me` account endpoint.
- Keep the backend independent from a specific identity provider.

## Authentication contract

The API accepts:

`Authorization: Bearer <JWT>`

The JWT `sub` claim must be the internal user UUID. The server verifies the signature, allowed algorithm, issuer/audience when configured, then loads the user from PostgreSQL.

**Authorization is database-backed.** The `role` claim is intentionally ignored. The effective role comes from `users.role`.

Supported roles in this phase:

- `user`
- `admin`

Supported account states:

- `active`
- `suspended`
- `deleted`

Only `active` accounts may authenticate.

## Account endpoint

### GET `/api/account/me`

Returns the authenticated account identity without exposing secrets:

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "status": "active",
    "role": "user",
    "createdAt": "..."
  }
}
```

## Identity provider boundary

This phase deliberately does not implement password storage, registration, password reset, social login, or an external identity provider.

A trusted identity provider may issue the JWT. The backend remains the authority for local account status, role, ownership, and authorization.

The current implementation uses HS256 with `JWT_SECRET` as the compatibility mechanism inherited from Phase 4.8. A subsequent identity-provider integration should move to an asymmetric/JWKS verification model so the API does not need to hold the identity provider's signing secret.

## Security requirements

- JWT secret is never accepted from request data.
- Only HS256 is accepted by the compatibility verifier.
- `sub` must be a UUID.
- Issuer/audience may be enforced through `AUTH_ISSUER` and `AUTH_AUDIENCE`.
- JWT role claims do not determine authorization.
- Suspended/deleted users cannot access authenticated operations.
- Existing share tokens remain separate from account JWTs.
- Existing immutable document/revision relationships remain unchanged.

## Migration

Apply:

`backend/migrations/0049-authentication-accounts.sql`

before enabling the Phase 4.9 server against an existing database.

The migration is additive and gives existing users the default role `user`.

## Regression boundary

Phase 4.9 must preserve:

- local/browser sharing;
- cloud/mock adapter behavior;
- document IDs;
- immutable revision IDs;
- content hashes;
- meeting source references;
- transcript/analysis hashes;
- share rotation and revocation;
- existing export behavior.

## Not production-complete yet

The following remain deployment/integration work:

- external IdP/SSO and asymmetric/JWKS verification;
- production secret manager/KMS;
- TLS/WAF/CDN;
- backup/disaster recovery;
- observability and alerting;
- production migration runner;
- full browser E2E authentication tests;
- account lifecycle operations such as deletion/export workflows.
