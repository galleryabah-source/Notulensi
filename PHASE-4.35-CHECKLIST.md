# Phase 4.35 — Verification Checklist

Before production endpoint activation, all items below must be explicitly recorded:

- [ ] `security:endpoint-contract-test`
- [ ] `security:regression-test`
- [ ] `security:pilot-test`
- [ ] `security:registry-test`
- [ ] `security:audit-test`
- [ ] `security:pre-activation-test`
- [ ] isolated live PostgreSQL integration test from Phase 4.25
- [ ] endpoint-specific production request test
- [ ] handler execution/deny-path verification
- [ ] browser regression verification for the existing HTML application

No checklist item is inferred as complete merely because source files exist.
