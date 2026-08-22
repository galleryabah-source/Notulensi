import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
const root=process.cwd();
const runtimeDomains=[
 ['17-E.runtime.health','runtime','Runtime health','Requires a real application execution environment.'],
 ['17-E.runtime.database','database','Database behavior','Requires a real database connection and controlled test data.'],
 ['17-E.runtime.auth','security','Authentication/RBAC','Requires real authentication and authorization execution.'],
 ['17-E.runtime.security','security','Security regression','Requires executable security tests in a configured environment.'],
 ['17-E.runtime.ai','ai','AI provider and cost controls','Requires configured AI provider execution and usage evidence.'],
 ['17-E.runtime.observability','observability','Observability','Requires real logs/metrics/traces from the running system.'],
 ['17-E.runtime.backup','backup','Backup/restore','Requires an actual backup and restore drill.'],
 ['17-E.runtime.dr','disaster-recovery','Disaster recovery','Requires an actual DR/failover exercise.'],
 ['17-E.runtime.performance','performance','Performance/load','Requires an executable performance test environment.'],
 ['17-E.runtime.release','release','Rollback/canary/release','Requires controlled deployment evidence.']
];
function git(args){return execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();}
function loadJson(path){if(!existsSync(path))return null;try{return JSON.parse(readFileSync(path,'utf8'));}catch{return null;}}
function promote(path,details){const value=loadJson(path); const real=value?.applicationRuntimeIntegrated===true&&value?.integrationFixture===false&&value?.status==='PASS'&&Array.isArray(value?.checks)&&value.checks.length>0&&value.checks.every(c=>c.status==='PASS'); if(real)return{status:'PASS',evidence:[path],details}; if(value?.status==='FAIL'||value?.checks?.some(c=>c.status==='FAIL'))return{status:'FAIL',evidence:[path],details:`${details} Evidence contains a failed executable check.`}; return{status:'NOT_RUN',evidence:[path],details};}
const commit=git(['rev-parse','HEAD']); const generatedAt=new Date().toISOString(); const checks=[{id:'17-E.static.git',phase:'17-E',name:'Git commit identity',status:/^[0-9a-f]{40}$/.test(commit)?'PASS':'FAIL',evidence:['git rev-parse HEAD'],details:commit}];
for(const [id,phase,name,details] of runtimeDomains){let observed={status:'NOT_RUN',evidence:[],details}; if(id==='17-E.runtime.health'){const v=loadJson(`${root}/phase17-execution/runtime-health.json`); observed=v?.status==='PASS'?{status:'PASS',evidence:['phase17-execution/runtime-health.json'],details:'Runtime health harness passed.'}:observed;} if(id==='17-E.runtime.backup')observed=promote(`${root}/phase17-execution/backup-restore-evidence.json`,'Real PostgreSQL backup/restore evidence is required.'); if(id==='17-E.runtime.dr')observed=promote(`${root}/phase17-execution/disaster-recovery-evidence.json`,'Real disaster-recovery evidence is required.'); checks.push({id,phase,name,status:['PASS','FAIL','NOT_RUN'].includes(observed.status)?observed.status:'NOT_RUN',evidence:observed.evidence||[],details:observed.details||details});}
const report={schemaVersion:'1.0.0',runId:randomUUID(),commit,environment:process.env.NODE_ENV==='production'?'production':'local',generatedAt,checks}; const output=process.env.EVIDENCE_OUTPUT||`${root}/phase17-execution/evidence-report.json`; writeFileSync(output,JSON.stringify(report,null,2)+'\n','utf8'); console.log(JSON.stringify({output,runId:report.runId,commit,checks:checks.map(({id,status})=>({id,status}))},null,2)); if(checks.some(c=>c.status!=='PASS'))process.exitCode=1;
