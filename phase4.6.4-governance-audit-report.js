/* Meeting Intelligence Ultimate — PHASE 4.6.4
 * Governance Audit Report & Release Gate
 * Additive, non-destructive. Does not mutate meeting/revision/pack data.
 */
(function(){
  'use strict';
  const VERSION='4.6.4';
  function run(){
    const checks=[];
    const add=(id,ok,detail)=>checks.push({id,ok:Boolean(ok),detail:String(detail||'')});
    add('phase461',typeof window.validateGovernanceMutationV461==='function','Phase 4.6.1 validator');
    add('phase462',typeof window.validateGovernanceMutationV462==='function','Phase 4.6.2 enforcement API');
    add('phase463',typeof window.runPhase463GovernanceRegressionMatrix==='function','Phase 4.6.3 regression matrix');
    add('integrity',typeof window.verifyPackIntegrityV461==='function','Pack integrity verifier');
    const result={version:VERSION,at:new Date().toISOString(),checks,pass:checks.every(x=>x.ok)};
    window.phase464GovernanceAuditResult=result;
    return result;
  }
  function releaseGate(){
    const r=run();
    return {allowed:r.pass,result:r,reason:r.pass?'Governance baseline structurally complete.':'One or more governance prerequisites are unavailable.'};
  }
  window.runPhase464GovernanceAudit=run;
  window.phase464ReleaseGate=releaseGate;
})();
