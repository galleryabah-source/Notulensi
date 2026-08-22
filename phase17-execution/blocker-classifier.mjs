import { existsSync, readFileSync } from 'node:fs';

const input = process.env.READINESS_INPUT || new URL('./evidence-report.json', import.meta.url);
const report = JSON.parse(readFileSync(input, 'utf8'));
const fidelityPath = process.env.FIDELITY_INPUT || new URL('./production-fidelity.json', import.meta.url);
const fidelity = existsSync(fidelityPath) ? JSON.parse(readFileSync(fidelityPath, 'utf8')) : null;

const rules = [
  [/security|auth|rbac|csrf|cors|secret/i, 'P0'],
  [/backup|restore|disaster|dr|rollback/i, 'P0'],
  [/database|data|integrity/i, 'P0'],
  [/production-fidelity|production|canary|load|infrastructure/i, 'P0'],
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

if (fidelity && fidelity.decision !== 'GO') {
  for (const blocker of (fidelity.blockers || [])) {
    blockers.push({
      id:`17-E.production-fidelity.${blocker}`,
      phase:'17-E',
      name:'Production fidelity gate',
      status:'HOLD',
      severity:'P0',
      details:`Production fidelity is HOLD: ${blocker}`,
      evidence:['phase17-execution/production-fidelity.json']
    });
  }
}

const unique = Array.from(new Map(blockers.map(b => [`${b.id}:${b.status}`, b])).values());
console.log(JSON.stringify({ runId:report.runId, commit:report.commit, blockerCount:unique.length, blockers:unique }, null, 2));
if (unique.length) process.exitCode = 3;
