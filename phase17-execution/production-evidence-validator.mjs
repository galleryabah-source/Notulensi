import { existsSync, readFileSync } from 'node:fs';

const root = process.cwd();
const domains = new Set(['production-dr', 'production-load', 'production-canary']);
const required = ['domain', 'environment', 'evidenceId', 'status', 'checks'];

export function validateProductionEvidence(value) {
  const errors = [];
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ['evidence must be an object'];
  for (const key of required) if (!(key in value)) errors.push(`missing required field: ${key}`);
  if (!domains.has(value.domain)) errors.push('domain must be production-dr, production-load, or production-canary');
  for (const key of ['environment', 'evidenceId']) if (typeof value[key] !== 'string' || value[key].length === 0) errors.push(`${key} must be a non-empty string`);
  if (value.status !== 'PASS' && value.status !== 'FAIL') errors.push('status must be PASS or FAIL');
  if (!value.checks || typeof value.checks !== 'object' || Array.isArray(value.checks) || Object.keys(value.checks).length === 0) errors.push('checks must be a non-empty object');
  return errors;
}

export function validateProductionEvidenceFile(path) {
  const absolute = path.startsWith('/') ? path : `${root}/${path}`;
  if (!existsSync(absolute)) return { status: 'NOT_RUN', errors: [`missing evidence artifact: ${path}`] };
  try {
    const value = JSON.parse(readFileSync(absolute, 'utf8'));
    const errors = validateProductionEvidence(value);
    return { status: errors.length ? 'FAIL' : 'PASS', errors, value };
  } catch (error) {
    return { status: 'FAIL', errors: [`invalid JSON: ${error.message}`] };
  }
}

if (process.argv[1]?.endsWith('production-evidence-validator.mjs')) {
  const files = process.argv.slice(2);
  if (!files.length) {
    console.error('Usage: node phase17-execution/production-evidence-validator.mjs <evidence.json> [...]');
    process.exitCode = 2;
  } else {
    const results = files.map((path) => ({ path, ...validateProductionEvidenceFile(path) }));
    console.log(JSON.stringify(results, null, 2));
    if (results.some((result) => result.status !== 'PASS')) process.exitCode = 1;
  }
}
