/*
 * Meeting Intelligence Ultimate — PHASE 4.6.2
 * Governance Enforcement Boundary
 *
 * Additive enforcement layer over Phase 4.6 + 4.6.1.
 * The guard is applied only at exposed governance boundaries; core meeting,
 * transcript, AI, revision and pack data are not rewritten.
 */
(function(){
  'use strict';

  const VERSION='4.6.2';
  const AUDIT_KEY='meeting_ai_governance_regression_v461';
  const wrapped={};

  function audit(event,details){
    try{
      const raw=localStorage.getItem(AUDIT_KEY);
      const list=raw?JSON.parse(raw):[];
      const next=Array.isArray(list)?list:[];
      next.push({version:VERSION,at:new Date().toISOString(),event,details:details||{}});
      localStorage.setItem(AUDIT_KEY,JSON.stringify(next.slice(-300)));
    }catch(e){console.warn('[Phase 4.6.2] audit failed',e);}
  }

  function currentDocumentId(){
    return String(window.currentGeneratedDocument?.documentId||window.getCurrentDocumentIdV42?.()||'');
  }

  function governanceEntry(id){
    try{
      const raw=localStorage.getItem('meeting_ai_document_governance_v46');
      const store=raw?JSON.parse(raw):{};
      return id&&store&&typeof store==='object'?store[id]||null:null;
    }catch(e){return null;}
  }

  function preflight(id,targetStatus){
    const docId=id||currentDocumentId();
    if(typeof window.validateGovernanceMutationV461!=='function'){
      return {ok:true,code:'GUARD_UNAVAILABLE',reason:'Phase 4.6.1 guard is not available; enforcement remains non-blocking.'};
    }
    const result=window.validateGovernanceMutationV461(docId,targetStatus);
    if(!result.ok) audit('mutation_blocked',{documentId:docId,targetStatus,code:result.code,reason:result.reason});
    return result;
  }

  function wrapStatus(){
    const name='applyGovernanceStatusV46';
    const original=window[name];
    if(typeof original!=='function'||wrapped[name]) return false;
    window[name]=function(){
      const select=document.getElementById('v46Lifecycle');
      const target=select?.value||'';
      const id=currentDocumentId();
      const check=preflight(id,target);
      if(!check.ok){
        if(typeof window.showToast==='function') window.showToast('Governance mencegah perubahan: '+check.reason,'warning');
        return {ok:false,blocked:true,...check};
      }
      const result=original.apply(this,arguments);
      audit('mutation_allowed',{documentId:id,targetStatus:target});
      return result;
    };
    wrapped[name]=true;
    return true;
  }

  function wrapExport(){
    const name='exportGovernanceV46';
    const original=window[name];
    if(typeof original!=='function'||wrapped[name]) return false;
    window[name]=function(){
      const id=currentDocumentId();
      if(typeof window.checkApprovedRevisionDriftV461==='function'){
        const drift=window.checkApprovedRevisionDriftV461(id);
        if(drift.checked&&!drift.ok){
          audit('export_blocked',{documentId:id,code:drift.code,reason:drift.reason});
          if(typeof window.showToast==='function') window.showToast('Governance integrity gagal: '+drift.reason,'error');
          return {ok:false,blocked:true,...drift};
        }
      }
      return original.apply(this,arguments);
    };
    wrapped[name]=true;
    return true;
  }

  function verifyBeforeMutation(id,targetStatus){
    const check=preflight(id,targetStatus);
    if(!check.ok) return check;
    const entry=governanceEntry(id||currentDocumentId());
    if(entry?.status==='approved'&&targetStatus!=='archived'){
      return {ok:false,code:'APPROVED_LOCK',reason:'Approved document must be explicitly unlocked before further lifecycle mutation.'};
    }
    if(entry?.status==='approved'&&typeof window.checkApprovedRevisionDriftV461==='function'){
      const drift=window.checkApprovedRevisionDriftV461(id||currentDocumentId());
      if(drift.checked&&!drift.ok) return drift;
    }
    return {ok:true,reason:'Governance preflight passed.'};
  }

  function selfTest(){
    const checks=[];
    checks.push(['Phase 4.6.1 guard available',typeof window.validateGovernanceMutationV461==='function']);
    checks.push(['Transition checker available',typeof window.transitionCheckV461==='function']);
    checks.push(['Status boundary detected',typeof window.applyGovernanceStatusV46==='function']);
    checks.push(['Export boundary detected',typeof window.exportGovernanceV46==='function']);
    const id=currentDocumentId();
    if(id&&typeof window.transitionCheckV461==='function'){
      checks.push(['Illegal draft→approved transition blocked',window.transitionCheckV461('draft','approved').ok===false]);
      checks.push(['Legal review→approved transition allowed',window.transitionCheckV461('review','approved').ok===true]);
    }else{
      checks.push(['Transition policy available without active document',typeof window.transitionCheckV461==='function']);
    }
    const report={phase:VERSION,timestamp:new Date().toISOString(),ok:checks.every(x=>x[1]),checks};
    audit('self_test',{ok:report.ok,checks});
    console.groupCollapsed(`[Phase ${VERSION}] ${report.ok?'PASS':'CHECK'}`);
    console.table(checks);
    console.log(report);
    console.groupEnd();
    return report;
  }

  function install(){
    const status=wrapStatus();
    const exportWrap=wrapExport();
    window.preflightGovernanceMutationV462=verifyBeforeMutation;
    window.runPhase462RegressionSelfTest=selfTest;
    window.getPhase462Version=()=>VERSION;
    audit('initialized',{statusBoundaryWrapped:status,exportBoundaryWrapped:exportWrap});
  }

  install();
})();
