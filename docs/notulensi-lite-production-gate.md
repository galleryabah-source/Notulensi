# Notulensi Lite — Production Gate

Status: **NOT READY FOR MERGE** until the shared persistence contract is audited.

## Current verified boundary
- Same repository as Full Notulensi.
- Same single Admin control plane.
- Lite has no AI module import or AI endpoint call.
- Lite uses a namespaced local persistence adapter only.
- No production database schema change is part of Version B.
- No migration is required for the current Lite prototype.

## Database audit result
The current `public` schema audit reports `app_storage`, `user_profiles`, and `audit_logs`. The architecture document describes `meetings` and `transcripts`, but those are not currently provisioned production tables.

## Why shared persistence is blocked
Creating or auto-creating new tables from a runtime endpoint would bypass the agreed database-audit gate. The existing repository contains an example of runtime `CREATE TABLE IF NOT EXISTS` in the landing-page configuration path; Lite must not repeat that pattern for meeting data.

## Required next gate
1. Inspect the existing backend ownership/auth contract.
2. Define canonical meeting/transcript data contract.
3. Decide whether existing storage can safely represent the contract without schema mutation.
4. Verify RLS/authorization semantics for any persistent path.
5. Add server persistence adapter only after the above is approved by evidence.
6. Run Full regression and Lite static/runtime checks.
7. Only then promote PR #59 from draft and merge.
