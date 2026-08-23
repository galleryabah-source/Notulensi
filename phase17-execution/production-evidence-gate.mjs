import { writeFileSync } from 'node:fs';
import { validateProductionEvidenceFile } from './production-evidence-validator.mjs';

const root=process.cwd();
const artifacts={
  'production-dr':process.env.PRODUCTION_DR_EVIDENCE_FILE||'phase17-execution/production-dr-evidence.json',
  'production-load':process.env.PRODUCTION_LOAD_EVIDENCE_FILE||'phase17-execution/production-load-evidence.json',
  'production-canary':process.env.PRODUCTION_CANARY_EVIDENCE_FILE||'phase17-execution/production-canary-evidence.json',
};
const expected={
  commitSha:process.env.PRODUCTION_EXPECTED_COMMIT_SHA||process.env.GITHUB_SHA||'',
  deploymentId:process.env.PRODUCTION_EXPECTED_DEPLOYMENT_ID||'',
  deploymentUrl:process.env.PRODUCTION_EXPECTED_DEPLOYMENT_URL||'',
};
const checks=Object.entries(artifacts).map(([domain,path])=>{
  const result=validateProductionEvidenceFile(path,expected);
  const errors=[...(result.errors||[])];
  if(result.status==='PASS'&&result.value?.domain!==domain)errors.push(`domain mismatch: expected ${domain}`);
  return {domain,path,status:errors.length?'FAIL':result.status,evidenceId:result.value?.evidenceId||null,environment:result.value?.environment||null,commitSha:result.value?.commitSha||null,deploymentId:result.value?.deploymentId||null,deploymentUrl:result.value?.deploymentUrl||null,errors};
});
const allPass=checks.length===3&&checks.every(c=>c.status==='PASS');
const report={schemaVersion:'1.1.0',gate:'production-fidelity',decision:allPass?'GO':'HOLD',failClosed:true,productionEvidenceOnly:true,provenanceBound:true,generatedAt:new Date().toISOString(),expected,checks,blockers:checks.filter(c=>c.status!=='PASS').map(c=>`${c.domain}-evidence-not-pass`)};
const output=process.env.PRODUCTION_EVIDENCE_GATE_OUTPUT||`${root}/phase17-execution/production-evidence-gate.json`;
writeFileSync(output,JSON.stringify(report,null,2)+'\n','utf8');
console.log(JSON.stringify(report,null,2));
if(!allPass)process.exitCode=2;
