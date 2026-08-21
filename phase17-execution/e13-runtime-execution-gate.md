# Phase 17-E.13 Runtime Execution Gate

This marker exists to trigger the branch CI execution after the E.13 backup/restore and disaster-recovery drills were audited.

Required verdict rule:

- `backup-restore-regression.mjs` must execute against the CI PostgreSQL service.
- `disaster-recovery-regression.mjs` must execute against the CI PostgreSQL service.
- `PASS` requires generated JSON evidence from the actual run.
- `NOT_RUN` or missing evidence remains non-PASS.
- The readiness aggregator remains fail-closed.

This file does not assert PASS; CI execution is the source of truth.
