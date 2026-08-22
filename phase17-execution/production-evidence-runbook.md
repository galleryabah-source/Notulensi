# Phase 17 Production Evidence Runbook

## Purpose

Convert the three remaining Production Fidelity P0 gates into real, auditable evidence without weakening the fail-closed policy.

## 1. Production DR

Required evidence:
- production-equivalent persisted workload identifier
- primary failure event timestamp
- recovery start timestamp
- recovery-ready timestamp
- RTO calculation
- explicit RPO measurement
- post-recovery row/hash verification
- operator/run identifier

Acceptance:
- persisted data verified after recovery
- RTO within approved SLA
- RPO within approved SLA
- no unexplained data loss

The CI controlled DR drill remains evidence of harness behavior only and MUST NOT set `PRODUCTION_DR_EVIDENCE=true`.

## 2. Production Load

Required evidence:
- production-equivalent target and release identifier
- request count and concurrency
- p50/p95/p99 latency
- error rate and error-budget consumption
- DB latency
- AI/provider latency
- CPU/memory/resource headroom
- comparison against approved baseline
- no-regression decision

Acceptance:
- all approved SLO/SLA thresholds pass
- no regression beyond approved tolerance
- evidence identifies the actual target environment

The CI load test MUST NOT set `PRODUCTION_LOAD_EVIDENCE=true`.

## 3. Production Canary

Required evidence:
- release candidate/version
- actual production traffic allocation
- canary request/response sample or telemetry reference
- health-gate result
- rollback decision if triggered
- post-rollback traffic and health verification
- release/run identifier

Acceptance:
- canary traffic is proven from production telemetry
- health gate passes or controlled rollback completes successfully
- post-rollback service health is verified

The CI controlled canary drill MUST NOT set `PRODUCTION_CANARY_EVIDENCE=true`.

## Promotion rule

Only the actual production evidence collection process may set the corresponding `PRODUCTION_*_EVIDENCE=true` values. No fixture, default, CI simulation, or manual boolean change is sufficient.

Once all three production evidence artifacts independently pass, the Production Fidelity Gate may transition from HOLD to GO and the blocker classifier should reach zero without bypassing any acceptance criteria.
