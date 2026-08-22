import { writeFileSync } from 'node:fs';
import { validateProductionEvidenceFile } from './production-evidence-validator.mjs';

const root = process.cwd();
const artifacts = {
  'production-dr': process.env.PRODUCTION_DR_EVIDENCE_FILE || 'phase17-execution/production-dr-evidence.json',
  'production-load': process.env.PRODUCTION_LOAD_EVIDENCE_FILE || 'phase17-execution/production-load-evidence.json',
  'production-canary': process.env.PRODUCTION_CANARY_EVIDENCE_FILE || 'phase17-execution/production-canary-evidence.json',
};

const checks = Object.entries(artifacts).map(([domain, path]) => {
  const result = validateProductionEvidenceFile(path);
  const errors = [...(result.errors || [])];
  if (result.status === 'PASS' && result.value?.domain !== domain) errors.push(`domain mismatch: expected ${domain}`);
  return { domain, path, status: errors.length ? 'FAIL' : result.status, evidenceId: result.value?.evidenceId || null, environment: result.value?.environment || null, errors };
});

const allPass = checks.length === 3 && checks.every((check) => check.status === 'PASS');
const report = {
  schemaVersion: '1.0.0',
  gate: 'production-fidelity',
  decision: allPass ? 'GO' : 'HOLD',
  failClosed: true,
  productionEvidenceOnly: true,
  generatedAt: new Date().toISOString(),
  checks,
  blockers: checks.filter((check) => check.status !== 'PASS').map((check) => `${check.domain}-evidence-not-pass`),
};

const output = process.env.PRODUCTION_EVIDENCE_GATE_OUTPUT || `${root}/phase17-execution/production-evidence-gate.json`;
writeFileSync(output, JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(report, null, 2));
if (!allPass) process.exitCode = 2;
