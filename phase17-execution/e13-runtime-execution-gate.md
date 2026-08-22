# Phase 17-E.13 Runtime Execution Gate

E.13 is PASS only when CI executes both real PostgreSQL drills and the evidence artifact reports PASS for every executable check.

Required drills:
- `backup-restore-regression.mjs`
- `disaster-recovery-regression.mjs`

Source inspection alone is not sufficient. Missing or malformed evidence remains NOT_RUN and fail-closed readiness remains NO-GO.
