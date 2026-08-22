import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const evidencePath = 'phase17-execution/evidence-report.json';
const requiredControlled = [
  ['17-E.runtime.dr','disaster-recovery'],
  ['17-E.runtime.performance','performance'],
  ['17-E.runtime.release','release'],
];
const productionProof = {
  infrastructureDr: process.env.PRODUCTION_DR_EVIDENCE === 'true',
  productionLoad: process.env.PRODUCTION_LOAD_EVIDENCE === 'true',
  productionCanary: process.env.PRODUCTION_CANARY_EVIDENCE === 'true',
};
let evidence = null;
if (existsSync(evidencePath)) evidence = JSON.parse(readFileSync(evidencePath,'utf8'));
const runtime = Object.fromEntries((evidence?.checks || []).map(c=>[c.id,c]));
const runtimePass = requiredControlled.every(([id])=>runtime[id]?.status==='PASS');
const controlledScopeDeclared = requiredControlled.every(([id])=>{
  const d=runtime[id]?.details || '';
  return d.length>0;
});
const productionProofComplete = Object.values(productionProof).every(Boolean);
const decision = runtimePass && controlledScopeDeclared && productionProofComplete ? 'GO' : 'HOLD';
const blockers=[];
if(!runtimePass) blockers.push('controlled-runtime-evidence-not-pass');
if(!controlledScopeDeclared) blockers.push('controlled-runtime-scope-undocumented');
for(const [key,value] of Object.entries(productionProof)) if(!value) blockers.push(`${key}-missing`);
const report={schemaVersion:'1.0.0',decision,gate:'production-fidelity',generatedAt:new Date().toISOString(),runtimeEvidence:{required:requiredControlled.map(([id,domain])=>({id,domain,status:runtime[id]?.status||'NOT_RUN'})),allPass:runtimePass},productionProof,productionProofComplete,blockers,policy:'CI controlled drills cannot by themselves be promoted to production deployment proof.'};
writeFileSync('phase17-execution/production-fidelity.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(decision==='HOLD') process.exitCode=2;
