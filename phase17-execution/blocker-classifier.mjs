import { readFileSync } from 'node:fs';

const input = process.env.READINESS_INPUT || new URL('./evidence-report.json', import.meta.url);
const report = JSON.parse(readFileSync(input, 'utf8'));

const rules = [
  [/security|auth|rbac|csrf|cors|secret/i, 'P0'],
  [/backup|restore|disaster|dr|rollback/i, 'P0'],
  [/database|data|integrity/i, 'P0'],
  [/ai|cost|quota/i, 'P1'],
  [/performance|latency|load/i, 'P1'],
  [/runtime|health|release|canary/i, 'P1'],
];

function severity(check) {
  if (check.status === 'PASS') return null;
  for (const [pattern, level] of rules) if (pattern.test(`${check.id} ${check.phase} ${check.name} ${check.details || ''}`)) return level;
  return 'P2';
}

const blockers = report.checks.filter(c => c.status !== 'PASS').map(c => ({
  id:c.id, phase:c.phase, name:c.name, status:c.status, severity:severity(c), details:c.details || '', evidence:c.evidence || []
}));

console.log(JSON.stringify({ runId:report.runId, commit:report.commit, blockerCount:blockers.length, blockers }, null, 2));
if (blockers.length) process.exitCode = 3;
