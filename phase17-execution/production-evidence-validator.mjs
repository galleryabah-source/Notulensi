import { existsSync, readFileSync } from 'node:fs';

const root = process.cwd();
const domains = new Set(['production-dr', 'production-load', 'production-canary']);
const required = ['domain','environment','evidenceId','status','checks','commitSha','deploymentId','deploymentUrl','generatedAt','observedAt','provenance'];
const productionEnvironments = new Set(['production','prod']);
const forbiddenMarkers = ['controlled-test-provider','controlled-test-model','phase17-test-issuer','phase17-test-audience','DO-NOT-USE-IN-PRODUCTION','localhost','127.0.0.1'];
const shaRe = /^[0-9a-f]{40}$/i;
const urlRe = /^https:\/\//i;
const isoRe = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

function hasForbiddenMarker(value){
  const text=JSON.stringify(value).toLowerCase();
  return forbiddenMarkers.some(marker=>text.includes(marker.toLowerCase()));
}

export function validateProductionEvidence(value, options={}) {
  const errors = [];
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ['evidence must be an object'];
  for (const key of required) if (!(key in value)) errors.push(`missing required field: ${key}`);
  if (!domains.has(value.domain)) errors.push('domain must be production-dr, production-load, or production-canary');
  if (!productionEnvironments.has(String(value.environment||'').toLowerCase())) errors.push('environment must be production');
  if (typeof value.evidenceId !== 'string' || !value.evidenceId.trim()) errors.push('evidenceId must be a non-empty string');
  if (!shaRe.test(String(value.commitSha||''))) errors.push('commitSha must be a 40-character Git SHA');
  if (typeof value.deploymentId !== 'string' || !value.deploymentId.trim()) errors.push('deploymentId must be a non-empty string');
  if (!urlRe.test(String(value.deploymentUrl||''))) errors.push('deploymentUrl must be an HTTPS URL');
  for (const key of ['generatedAt','observedAt']) if (!isoRe.test(String(value[key]||''))) errors.push(`${key} must be an ISO-8601 UTC timestamp`);
  if (value.status !== 'PASS' && value.status !== 'FAIL') errors.push('status must be PASS or FAIL');
  if (!value.checks || typeof value.checks !== 'object' || Array.isArray(value.checks) || Object.keys(value.checks).length === 0) errors.push('checks must be a non-empty object');
  if (!value.provenance || typeof value.provenance !== 'object' || Array.isArray(value.provenance)) errors.push('provenance must be an object');
  else {
    if (value.provenance.commitSha !== value.commitSha) errors.push('provenance.commitSha must equal commitSha');
    if (value.provenance.deploymentId !== value.deploymentId) errors.push('provenance.deploymentId must equal deploymentId');
    if (value.provenance.deploymentUrl !== value.deploymentUrl) errors.push('provenance.deploymentUrl must equal deploymentUrl');
    if (value.provenance.environment !== value.environment) errors.push('provenance.environment must equal environment');
  }
  if (hasForbiddenMarker(value)) errors.push('production evidence contains a forbidden controlled/test marker');
  if (options.expectedCommitSha && value.commitSha !== options.expectedCommitSha) errors.push(`commitSha mismatch: expected ${options.expectedCommitSha}`);
  if (options.expectedDeploymentId && value.deploymentId !== options.expectedDeploymentId) errors.push(`deploymentId mismatch: expected ${options.expectedDeploymentId}`);
  if (options.expectedDeploymentUrl && value.deploymentUrl !== options.expectedDeploymentUrl) errors.push(`deploymentUrl mismatch: expected ${options.expectedDeploymentUrl}`);
  return errors;
}

export function validateProductionEvidenceFile(path, options={}) {
  const absolute = path.startsWith('/') ? path : `${root}/${path}`;
  if (!existsSync(absolute)) return { status: 'NOT_RUN', errors: [`missing evidence artifact: ${path}`] };
  try {
    const value = JSON.parse(readFileSync(absolute, 'utf8'));
    const errors = validateProductionEvidence(value, options);
    return { status: errors.length ? 'FAIL' : 'PASS', errors, value };
  } catch (error) {
    return { status: 'FAIL', errors: [`invalid JSON: ${error.message}`] };
  }
}

if (process.argv[1]?.endsWith('production-evidence-validator.mjs')) {
  const files = process.argv.slice(2);
  if (!files.length) { console.error('Usage: node phase17-execution/production-evidence-validator.mjs <evidence.json> [...]'); process.exitCode=2; }
  else { const results=files.map(path=>({path,...validateProductionEvidenceFile(path)})); console.log(JSON.stringify(results,null,2)); if(results.some(result=>result.status!=='PASS')) process.exitCode=1; }
}
