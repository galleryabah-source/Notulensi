# PHASE 4.9 — External Recipient & Secure Sharing

## Scope
Additive recipient/access-control layer over Phase 4.8 controlled publishing.

## Recipient model
- owner
- approver
- internal
- external

## Access scope
- pack
- documents
- document

## Security contract
- opaque random access token is stored locally for this prototype
- exported manifests contain a token hash, never the raw token
- expiration and revocation are enforced before access
- access, scope changes, revocation and expiration are auditable

## Compatibility
This phase does not rewrite meeting history, rawAI, analysis, continuity state, knowledge graph, document revisions, lifecycle history, or Phase 4.8 share records.

## Public-production note
Before production external sharing, move token storage/validation to the server, store only a cryptographic token hash, use authenticated HTTPS endpoints, rate limiting, secure cookies or authorization headers as appropriate, and avoid exposing recipient tokens to client-side localStorage.

## Self-test
`runPhase49SelfTest()` validates create, token access, scope change, revoke, audit and manifest integrity.