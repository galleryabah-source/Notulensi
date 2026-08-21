import { readFileSync } from 'node:fs';

const input = process.env.EVIDENCE_INPUT || new URL('./evidence-report.json', import.meta.url);
const report = JSON.parse(readFileSync(input, 'utf8'));

const allowed = new Set(['PASS','FAIL','BLOCKED','NOT_RUN']);
const invalid = report.checks.filter(c => !allowed.has(c.status));
const blockers = report.checks.filter(c => c.status !== 'PASS');
const result = {
  schemaVersion: report.schemaVersion,
  runId: report.runId,
  commit: report.commit,
  environment: report.environment,
  decision: invalid.length === 0 && blockers.length === 0 ? 'GO' : 'NO-GO',
  failClosed: true,
  blockerCount: blockers.length + invalid.length,
  blockers: [...blockers, ...invalid].map(c => ({ id:c.id, phase:c.phase, name:c.name, status:c.status, details:c.details || '' }))
};
console.log(JSON.stringify(result, null, 2));
if (result.decision !== 'GO') process.exitCode = 2;
