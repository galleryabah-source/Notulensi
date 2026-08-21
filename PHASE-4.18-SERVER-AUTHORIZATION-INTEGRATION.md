# PHASE 4.18 — Server Authorization Integration

## Objective
Connect request authorization to the Phase 4.17 persistence boundary while preserving the existing client-side meeting/document behavior.

## Request pipeline
```text
Request
 → schema validation
 → session lookup
 → session expiry/revocation
 → share lookup
 → share expiry/revocation
 → recipient resolution
 → permission evaluation
 → immutable audit
 → protected handler
```

## Fail-closed rules
- Missing authentication denies.
- Missing session denies.
- Expired/revoked session denies.
- Missing/expired/revoked share denies.
- Recipient mismatch denies.
- Unknown permission denies.
- Handler is never invoked after a denial.

## Adapter boundary
The integration layer accepts repository dependencies instead of importing a database driver. This keeps the authorization service testable and allows a future SQL adapter without changing request semantics.

## Compatibility
No existing meeting, transcript, analysis, document, revision, template or history state is rewritten by this phase.

## Definition of done
- [x] Authorization service implemented.
- [x] Persistence injected through repository boundary.
- [x] Fail-closed evaluation enforced.
- [x] Audit written for allow and deny decisions.
- [x] Protected handler executes only after ALLOW.
- [x] Existing domain model untouched.
