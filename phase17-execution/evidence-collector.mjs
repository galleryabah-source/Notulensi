import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const root = process.cwd();
const required = [
  ['17.1','phase17.1-full-system-validation.js'], ['17.2','phase17.2-evidence-collection.js'], ['17.3','phase17.3-security-acceptance.js'], ['17.4','phase17.4-performance-acceptance.js'], ['17.5','phase17.5-ai-cost-acceptance.js'], ['17.6','phase17.6-backup-restore-acceptance.js'], ['17.7','phase17.7-dr-acceptance.js'], ['17.8','phase17.8-canary-acceptance.js'], ['17.9','phase17.9-release-candidate.js'], ['17.10','phase17.10-go-no-go-review.js'], ['17.11','phase17.11-controlled-production-release.js'], ['17.12','phase17.12-post-release-hypercare.js'], ['17.13','phase17.13-legacy-retirement-decision.js'], ['17.14','phase17.14-blueprint-closure.js']
];
const runtimeDomains = [
  ['17-E.runtime.health','runtime','Runtime health','Requires a real application execution environment.'], ['17-E.runtime.database','database','Database behavior','Requires a real database connection and controlled test data.'], ['17-E.runtime.auth','security','Authentication/RBAC','Requires real authentication and authorization execution.'], ['17-E.runtime.security','security','Security regression','Requires executable security tests in a configured environment.'], ['17-E.runtime.ai','ai','AI provider and cost controls','Requires configured AI provider execution and usage evidence.'], ['17-E.runtime.observability','observability','Observability','Requires real logs/metrics/traces from the running system.'], ['17-E.runtime.backup','backup','Backup/restore','Requires an actual backup and restore drill.'], ['17-E.runtime.dr','disaster-recovery','Disaster recovery','Requires an actual DR/failover exercise.'], ['17-E.runtime.performance','performance','Performance/load','Requires an executable performance test environment.'], ['17-E.runtime.release','release','Rollback/canary/release','Requires controlled deployment evidence.']
];
function git(args) { return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim(); }
function loadJson(path) { if (!existsSync(path)) return null; try { return JSON.parse(readFileSync(path, 'utf8')); } catch (error) { console.warn(`Evidence parse failed: ${path}: ${error.message}`); return null; } }
function checkFile(path) { const absolute = `${root}/${path}`; if (!existsSync(absolute)) return { status:'FAIL', evidence:[], details:`Missing required artifact: ${path}` }; const text = readFileSync(absolute,'utf8'); if (!text.trim()) return { status:'FAIL', evidence:[], details:`Empty artifact: ${path}` }; return { status:'PASS', evidence:[path], details:`Artifact exists and is non-empty (${text.length} bytes).` }; }
const commit = git(['rev-parse','HEAD']);
const generatedAt = new Date().toISOString();
const runtimeEvidence = loadJson(process.env.RUNTIME_EVIDENCE_INPUT || `${root}/phase17-execution/runtime-evidence.json`);
const runtimeMap = new Map((runtimeEvidence?.checks || []).map(check => [check.id, check]));
const authBoundaryEvidence = loadJson(process.env.AUTH_BOUNDARY_EVIDENCE_INPUT || `${root}/phase17-execution/auth-boundary-evidence.json`);
const applicationAuthEvidence = loadJson(process.env.APPLICATION_AUTH_EVIDENCE_INPUT || `${root}/phase17-execution/application-auth-evidence.json`);
const applicationAuthIntegration = loadJson(process.env.APPLICATION_AUTH_INTEGRATION_INPUT || `${root}/phase17-execution/application-auth-integration.json`);
const applicationRealAuthEvidence = loadJson(process.env.APPLICATION_REAL_AUTH_EVIDENCE_INPUT || `${root}/phase17-execution/application-real-auth-evidence.json`);
const securityRegressionEvidence = loadJson(process.env.SECURITY_REGRESSION_EVIDENCE_INPUT || `${root}/phase17-execution/security-regression-evidence.json`);
const checks = required.map(([phase,path]) => ({ id:`17-E.static.${phase}`, phase, name:`Phase ${phase} artifact integrity`, ...checkFile(path) }));
checks.push({ id:'17-E.static.git', phase:'17-E', name:'Git commit identity', status:/^[0-9a-f]{40}$/.test(commit)?'PASS':'FAIL', evidence:['git rev-parse HEAD'], details:commit });
for (const [id,phase,name,details] of runtimeDomains) {
  let observed = runtimeMap.get(id);
  if (id === '17-E.runtime.auth') {
    const realAppPass = applicationRealAuthEvidence?.applicationRuntimeIntegrated === true && applicationRealAuthEvidence?.integrationFixture === false && Array.isArray(applicationRealAuthEvidence.checks) && applicationRealAuthEvidence.checks.length > 0 && applicationRealAuthEvidence.checks.every(check => check.status === 'PASS');
    const fixturePass = applicationAuthEvidence?.integrationFixture === true && Array.isArray(applicationAuthEvidence.checks) && applicationAuthEvidence.checks.length > 0 && applicationAuthEvidence.checks.every(check => check.status === 'PASS');
    const integrationPass = applicationAuthIntegration?.status === 'PASS' && applicationAuthIntegration?.applicationRuntimeIntegrated === true && applicationAuthIntegration?.fixturePromotionAllowed === true;
    if (realAppPass) {
      observed = { status:'PASS', evidence:['phase17-execution/application-real-auth-evidence.json'], details:'Real Meeting Intelligence runtime adapter served the application entrypoint and executable authentication/RBAC checks passed on the same runtime origin.' };
    } else if (applicationRealAuthEvidence?.checks?.some(check => check.status === 'FAIL')) {
      observed = { status:'FAIL', evidence:['phase17-execution/application-real-auth-evidence.json'], details:'Real application runtime authentication evidence contains a failed executable check.' };
    } else if (fixturePass && integrationPass) {
      observed = { status:'PASS', evidence:['phase17-execution/application-auth-evidence.json','phase17-execution/application-auth-integration.json'], details:'Executable authentication/RBAC checks passed and the real application runtime explicitly reported authenticated integration.' };
    } else if (applicationAuthIntegration?.status === 'FAIL') {
      observed = applicationAuthIntegration;
    } else {
      observed = { status:'NOT_RUN', evidence:[...(authBoundaryEvidence?.evidence || []),'phase17-execution/application-auth-evidence.json','phase17-execution/application-auth-integration.json','phase17-execution/application-real-auth-evidence.json'], details:applicationRealAuthEvidence?.details || applicationAuthIntegration?.details || applicationAuthEvidence?.details || authBoundaryEvidence?.details || details };
    }
  }
  if (id === '17-E.runtime.security') {
    const realSecurityPass = securityRegressionEvidence?.applicationRuntimeIntegrated === true && securityRegressionEvidence?.integrationFixture === false && Array.isArray(securityRegressionEvidence.checks) && securityRegressionEvidence.checks.length > 0 && securityRegressionEvidence.checks.every(check => check.status === 'PASS');
    const failed = securityRegressionEvidence?.checks?.some(check => check.status === 'FAIL');
    if (realSecurityPass) {
      observed = { status:'PASS', evidence:['phase17-execution/security-regression-evidence.json'], details:'Real Meeting Intelligence runtime security regression completed with every executable security boundary check passing.' };
    } else if (failed) {
      observed = { status:'FAIL', evidence:['phase17-execution/security-regression-evidence.json'], details:'Real application runtime security regression contains a failed executable security check.' };
    } else {
      observed = { status:'NOT_RUN', evidence:['phase17-execution/security-regression-evidence.json'], details:'Security regression has not produced complete real-application executable evidence.' };
    }
  }
  checks.push({ id, phase, name, status:['PASS','FAIL','NOT_RUN'].includes(observed?.status) ? observed.status : 'NOT_RUN', evidence:Array.isArray(observed?.evidence)?observed.evidence:[], details:observed?.details || details });
}
const report = { schemaVersion:'1.0.0', runId:randomUUID(), commit, environment:process.env.NODE_ENV === 'production'?'production':'local', generatedAt, checks };
const output = process.env.EVIDENCE_OUTPUT || `${root}/phase17-execution/evidence-report.json`;
writeFileSync(output, JSON.stringify(report,null,2)+'\n','utf8');
console.log(JSON.stringify({ output, runId:report.runId, commit, checks:checks.map(({id,status})=>({id,status})) },null,2));
if (checks.some(c=>c.status!=='PASS')) process.exitCode=1;
