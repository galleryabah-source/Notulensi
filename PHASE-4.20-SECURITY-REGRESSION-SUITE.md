# PHASE 4.20 — Security Regression Suite

## Objective
Create a deterministic regression gate covering Phases 4.16–4.19 and explicitly asserting that existing domain state is not mutated by the new security layers.

## Test groups
- Persistence schema and secret rejection.
- Session/share revocation monotonicity.
- Authorization allow/deny behavior.
- Handler fail-closed behavior.
- Audit emission.
- Request ID, origin, input-size and rate-limit controls.
- API surface compatibility: new globals are additive and do not overwrite baseline names.

## Regression policy
A phase is not considered complete if a security test passes only by weakening an existing feature or changing its public behavior.

## Execution
The suite is browser/runtime neutral and exposes one entry point:

```js
runPhase420SelfTest()
```

It can be embedded in a later CI harness. This phase does not introduce a test framework dependency into the existing single-file application.

## Definition of done
- [x] Cross-phase regression harness provided.
- [x] Additive API checks provided.
- [x] Security invariants checked.
- [x] Fail-closed authorization checked.
- [x] Existing-domain mutation guard checked.
- [ ] Full CI/browser matrix deferred to production build pipeline.
