# PHASE 4.8 — Production Cloud Backend

This backend is the first production implementation layer for the Phase 4.7 secure-share contract. It is additive: the existing browser/local/mock sharing flow is not removed.

## Runtime

- Node.js 20+
- PostgreSQL
- Express
- Helmet
- CORS allow-list
- PostgreSQL connection pool
- JWT bearer authentication for owner/admin operations
- Cryptographically random share tokens
- HMAC-SHA256 token hashing at rest
- Constant-time hash comparison
- Rate limiting on public resolution
- Hashed IP and user-agent audit metadata

## Install

```bash
cd backend
npm install
```

Copy `.env.example` to `.env` and provide production secrets through the deployment secret manager. Never commit `.env`.

## Database

Apply `schema.sql` to the production PostgreSQL database using your normal migration/deployment pipeline.

## Run

```bash
npm start
```

Health endpoint:

`GET /health`

## Authentication

The backend expects a signed JWT in the form:

`Authorization: Bearer <jwt>`

The JWT `sub` claim is the internal user UUID. `role=admin` is supported for organization-level administration. A real identity provider should issue these tokens; this service intentionally does not implement password storage or login.

## Share lifecycle

1. Authenticated owner calls `POST /api/shares`.
2. Server verifies document/revision ownership.
3. Server generates a random token and stores only its HMAC hash.
4. Raw token is returned once.
5. Client presents the token to `GET /api/shares/:shareId`.
6. Server validates token, revocation, expiration, and rate limits.
7. Access is audited without storing raw network identifiers.
8. Owner can revoke or rotate the token.

## Traceability

A share is immutable with respect to its selected revision:

`share -> document -> revision -> contentHash -> sourceMeetingId -> transcriptHash/analysisHash`

A later revision does not mutate an existing share.

## Production requirements still external to this service

- Identity provider / SSO
- Secret manager / KMS
- TLS termination
- PostgreSQL backups and disaster recovery
- WAF/CDN policy
- Observability and alerting
- Automated database migrations
- E2E security tests

The implementation is production-oriented, but deployment should not be described as production-ready until those infrastructure controls and integration tests are configured and verified.
