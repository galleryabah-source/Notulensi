import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const root = process.cwd();
const required = [
  ['17.1','phase17.1-full-system-validation.js'],
  ['17.2','phase17.2-evidence-collection.js'],
  ['17.3','phase17.3-security-acceptance.js'],
  ['17.4','phase17.4-performance-acceptance.js'],
  ['17.5','phase17.5-ai-cost-acceptance.js'],
  ['17.6','phase17.6-backup-restore-acceptance.js'],
  ['17.7','phase17.7-dr-acceptance.js'],
  ['17.8','phase17.8-canary-acceptance.js'],
  ['17.9','phase17.9-release-candidate.js'],
  ['17.10','phase17.10-go-no-go-review.js'],
  ['17.11','phase17.11-controlled-production-release.js'],
  ['17.12','phase17.12-post-release-hypercare.js'],
  ['17.13','phase17.13-legacy-retirement-decision.js'],
  ['17.14','phase17.14-blueprint-closure.js'],
];

const runtimeDomains = [
  ['17-E.runtime.health','runtime','Runtime health','Requires a real application execution environment.'],
  ['17-E.runtime.database','database','Database behavior','Requires a real database connection and controlled test data.'],
  ['17-E.runtime.auth','security','Authentication/RBAC','Requires real authentication and authorization execution.'],
  ['17-E.runtime.security','security','Security regression','Requires executable security tests in a configured environment.'],
  ['17-E.runtime.ai','ai','AI provider and cost controls','Requires configured AI provider execution and usage evidence.'],
  ['17-E.runtime.observability','observability','Observability','Requires real logs/metrics/traces from the running system.'],
  ['17-E.runtime.backup','backup','Backup/restore','Requires an actual backup and restore drill.'],
  ['17-E.runtime.dr','disaster-recovery','Disaster recovery','Requires an actual DR/failover exercise.'],
  ['17-E.runtime.performance','performance','Performance/load','Requires an executable performance test environment.'],
  ['17-E.runtime.release','release','Rollback/canary/release','Requires controlled deployment evidence.'],
];

function git(args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}
function checkFile(path) {
  const absolute = `${root}/${path}`;
  if (!existsSync(absolute)) return { status: 'FAIL', evidence: [], details: `Missing required artifact: ${path}` };
  const text = readFileSync(absolute, 'utf8');
  if (!text.trim()) return { status: 'FAIL', evidence: [], details: `Empty artifact: ${path}` };
  return { status: 'PASS', evidence: [path], details: `Artifact exists and is non-empty (${text.length} bytes).` };
}

const commit = git(['rev-parse','HEAD']);
const generatedAt = new Date().toISOString();
const checks = required.map(([phase, path]) => {
  const result = checkFile(path);
  return { id: `17-E.static.${phase}`, phase, name: `Phase ${phase} artifact integrity`, ...result };
});
checks.push({
  id: '17-E.static.git', phase: '17-E', name: 'Git commit identity', status: /^[0-9a-f]{40}$/.test(commit) ? 'PASS' : 'FAIL', evidence: ['git rev-parse HEAD'], details: commit
});

// Runtime domains are deliberately NOT_RUN until a real execution harness supplies evidence.
// This prevents a source-only CI run from being misclassified as production-ready.
for (const [id, phase, name, details] of runtimeDomains) {
  checks.push({ id, phase, name, status: 'NOT_RUN', evidence: [], details });
}

const report = { schemaVersion:'1.0.0', runId:randomUUID(), commit, environment:process.env.NODE_ENV === 'production' ? 'production' : 'local', generatedAt, checks };
const output = process.env.EVIDENCE_OUTPUT || `${root}/phase17-execution/evidence-report.json`;
writeFileSync(output, JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ output, runId:report.runId, commit, checks:checks.map(({id,status})=>({id,status})) }, null, 2));

if (checks.some(c => c.status !== 'PASS')) process.exitCode = 1;
