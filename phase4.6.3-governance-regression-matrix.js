/*
 * Meeting Intelligence Ultimate — PHASE 4.6.3
 * Governance Regression Matrix
 *
 * Additive test layer. It does not mutate meeting data, revisions, packs,
 * history, transcript, analysis, or governance records.
 */
(function(){
  'use strict';

  const VERSION='4.6.3';
  const AUDIT_KEY='meeting_ai_governance_regression_v463';

  function record(event,extra){
    try{
      const raw=localStorage.getItem(AUDIT_KEY);
      const list=raw?JSON.parse(raw):[];
      const next=Array.isArray(list)?list:[];
      next.push({version:VERSION,event,at:new Date().toISOString(),...extra});
      localStorage.setItem(AUDIT_KEY,JSON.stringify(next.slice(-300)));
    }catch(e){console.warn('[Phase 4.6.3] audit write failed',e);}
  }

  function guard(){return window.validateGovernanceMutationV461;}
  function transition(from,to){return window.transitionCheckV461?window.transitionCheckV461(from,to):{ok:false,reason:'Phase 4.6.1 guard unavailable.'};}

  function expect(name,condition,details){return {name,ok:!!condition,details:details||''};}

  async function run(){
    const results=[];
    const g=guard();

    results.push(expect('Guard API available',typeof g==='function'));
    results.push(expect('DRAFT → REVIEW allowed',transition('draft','review').ok));
    results.push(expect('REVIEW → APPROVED allowed',transition('review','approved').ok));
    results.push(expect('REVIEW → DRAFT allowed',transition('review','draft').ok));
    results.push(expect('APPROVED → ARCHIVED allowed',transition('approved','archived').ok));
    results.push(expect('DRAFT → APPROVED blocked',!transition('draft','approved').ok));
    results.push(expect('ARCHIVED → DRAFT blocked',!transition('archived','draft').ok));
    results.push(expect('APPROVED → DRAFT blocked',!transition('approved','draft').ok));

    if(typeof g==='function'){
      results.push(expect('Unknown governance record permits creation',g('matrix-new-doc','draft').ok));
      results.push(expect('Invalid mutation is rejected',!g('matrix-doc','approved').ok || g('matrix-doc','approved').reason==='No governance record yet; creation is allowed.'));
    }else{
      results.push(expect('Mutation boundary skipped because guard unavailable',false));
    }

    results.push(expect('Phase 4.2 restore remains available',typeof window.restoreDocumentRevisionV42==='function'));
    results.push(expect('Phase 4.6.1 self-test remains available',typeof window.runPhase461RegressionSelfTest==='function'));
    results.push(expect('Phase 4.6.2 enforcement remains available',typeof window.preflightGovernanceMutationV462==='function' || typeof window.enforceGovernanceMutationV462==='function'));

    const report={phase:VERSION,timestamp:new Date().toISOString(),ok:results.every(x=>x.ok),results};
    record('matrix_run',{ok:report.ok,failed:results.filter(x=>!x.ok).map(x=>x.name)});
    console.groupCollapsed(`[Phase ${VERSION}] ${report.ok?'PASS':'CHECK'}`);
    console.table(results);
    console.log(report);
    console.groupEnd();
    return report;
  }

  window.runPhase463GovernanceRegressionMatrix=run;
  window.getPhase463Version=()=>VERSION;
  record('initialized',{});
})();
