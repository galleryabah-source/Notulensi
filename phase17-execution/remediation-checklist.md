# Phase 17-E.9 — Remediation Checklist

## Mandatory lifecycle

For every non-PASS evidence item:

1. IDENTIFY — record the exact failing or blocked check.
2. REPRODUCE — reproduce it in the same environment where possible.
3. ROOT_CAUSE — document the technical cause, not only the symptom.
4. MINIMAL_FIX — change the smallest safe surface.
5. TEST — rerun the affected check and relevant regression tests.
6. EVIDENCE — attach the new result and immutable artifact reference.
7. RE_RUN_GATE — rerun the readiness gate and confirm the blocker disappears.

## Priority

- P0: blocks release immediately; security, data integrity, backup/restore, DR, or rollback failures require explicit approval before closure.
- P1: blocks production until resolved; includes runtime, AI cost/quota, performance, release, and canary failures.
- P2: blocks final blueprint closure unless formally accepted and documented.
- P3: tracked improvement; never silently converted into PASS.

## Safety constraints

- Do not weaken a gate to make it pass.
- Do not replace missing runtime evidence with source-code evidence.
- Do not expose secrets in evidence.
- Do not delete legacy functionality as part of remediation unless a separately approved retirement decision exists.
- Preserve rollback capability during every remediation.
