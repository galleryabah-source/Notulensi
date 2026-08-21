import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const root = process.cwd();
const runtimeDomains = [
  ['17-E.runtime.health','runtime','Runtime health','Requires a real application execution environment.'], ['17-E.runtime.database','database','Database behavior','Requires a real database connection and controlled test data.'], ['17-E.runtime.auth','security','Authentication/RBAC','Requires real authentication and authorization execution.'], ['17-E.runtime.security','security','Security regression','Requires executable security tests in a configured environment.'], ['17-E.runtime.ai','ai','AI provider and cost controls','Requires configured AI provider execution and usage evidence.'], ['17-E.runtime.observability','observability','Observability','Requires real logs/metrics/traces from the running system.'], ['17-E.runtime.backup','backup','Backup/restore','Requires an actual backup and restore drill.'], ['17-E.runtime.dr','disaster-recovery','Disaster recovery','Requires an actual DR/failover exercise.'], ['17-E.runtime.performance','performance','Performance/load','Requires an executable performance test environment.'], ['17-E.runtime.release','release','Rollback/canary/release','Requires controlled deployment evidence.']
];
function git(args) { return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim(); }
function loadJson(path) { if (!existsSync(path)) return null; try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return null; } }
const commit = git(['rev-parse','HEAD']);
const generatedAt = new Date().toISOString();
const checks = [{ id:'17-E.static.git', phase:'17-E', name:'Git commit identity', status:/^[0-9a-f]{40}$/.test(commit)?'PASS':'FAIL', evidence:['git rev-parse HEAD'], details:commit }];
const runtimeEvidence = loadJson(process.env.RUNTIME_EVIDENCE_INPUT || `${root}/phase17-execution/runtime-evidence.json`);
const realAuth = loadJson(process.env.APPLICATION_REAL_AUTH_EVIDENCE_INPUT || `${root}/phase17-execution/application-real-auth-evidence.json`);
const security = loadJson(process.env.SECURITY_REGRESSION_EVIDENCE_INPUT || `${root}/phase17-execution/security-regression-evidence.json`);
const ai = loadJson(process.env.AI_COST_EVIDENCE_INPUT || `${root}/phase17-execution/ai-cost-evidence.json`);
const observability = loadJson(process.env.OBSERVABILITY_EVIDENCE_INPUT || `${root}/phase17-execution/observability-evidence.json`);
const backup = loadJson(process.env.BACKUP_RESTORE_EVIDENCE_INPUT || `${root}/phase17-execution/backup-restore-evidence.json`);
const dr = loadJson(process.env.DR_EVIDENCE_INPUT || `${root}/phase17-execution/disaster-recovery-evidence.json`);
const performance = loadJson(process.env.PERFORMANCE_REGRESSION_EVIDENCE_INPUT || `${root}/phase17-execution/performance-regression-evidence.json`);
const release = loadJson(process.env.RELEASE_EVIDENCE_INPUT || `${root}/phase17-execution/release-canary-evidence.json`);
const runtimeMap = new Map((runtimeEvidence?.checks || []).map(c => [c.id,c]));
function promote(file, evidence, details) {
  const real = evidence?.applicationRuntimeIntegrated === true && evidence?.integrationFixture === false && evidence?.status === 'PASS' && Array.isArray(evidence?.checks) && evidence.checks.length > 0 && evidence.checks.every(c=>c.status==='PASS');
  const failed = evidence?.status === 'FAIL' || evidence?.checks?.some(c=>c.status==='FAIL');
  return real ? {status:'PASS',evidence:[`phase17-execution/${file}.json`],details} : failed ? {status:'FAIL',evidence:[`phase17-execution/${file}.json`],details:`${details} Evidence contains a failed executable check.`} : {status:'NOT_RUN',evidence:[`phase17-execution/${file}.json`],details};
}
for (const [id,phase,name,details] of runtimeDomains) {
  let observed = runtimeMap.get(id) || {status:'NOT_RUN',evidence:[],details};
  if(id==='17-E.runtime.auth') observed = promote('application-real-auth-evidence',realAuth,'Real application authentication/RBAC evidence is required.');
  if(id==='17-E.runtime.security') observed = promote('security-regression-evidence',security,'Real application security regression evidence is required.');
  if(id==='17-E.runtime.ai') observed = promote('ai-cost-evidence',ai,'Real application AI provider, usage, cost, and budget evidence is required.');
  if(id==='17-E.runtime.observability') observed = promote('observability-evidence',observability,'Real application observability evidence is required.');
  if(id==='17-E.runtime.backup') observed = promote('backup-restore-evidence',backup,'Real PostgreSQL backup/restore evidence is required.');
  if(id==='17-E.runtime.dr') observed = promote('disaster-recovery-evidence',dr,'Real disaster-recovery evidence is required.');
  if(id==='17-E.runtime.performance') observed = promote('performance-regression-evidence',performance,'Real application performance evidence is required.');
  if(id==='17-E.runtime.release') observed = promote('release-canary-evidence',release,'Controlled canary and rollback evidence is required; rollback cannot self-declare success.');
  checks.push({id,phase,name,status:['PASS','FAIL','NOT_RUN'].includes(observed.status)?observed.status:'NOT_RUN',evidence:observed.evidence||[],details:observed.details||details});
}
const report={schemaVersion:'1.0.0',runId:randomUUID(),commit,environment:process.env.NODE_ENV==='production'?'production':'local',generatedAt,checks};
const output=process.env.EVIDENCE_OUTPUT||`${root}/phase17-execution/evidence-report.json`;
writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({output,runId:report.runId,commit,checks:checks.map(({id,status})=>({id,status}))},null,2));
if(checks.some(c=>c.status!=='PASS')) process.exitCode=1;
