/*
 * Meeting Intelligence Ultimate — PHASE 4.6.1
 * Governance State Machine, Approval Fingerprint & Regression Hardening
 *
 * Additive safety layer over Phase 4.6.
 * It does not rewrite existing meeting data, revisions, packs, or governance state.
 * It detects unsafe lifecycle transitions and post-approval revision drift.
 */
(function(){
  'use strict';

  const GOVERNANCE_KEY = 'meeting_ai_document_governance_v46';
  const AUDIT_KEY = 'meeting_ai_governance_regression_v461';
  const VERSION = '4.6.1';
  const TRANSITIONS = {
    draft: ['review','archived'],
    review: ['draft','approved','archived'],
    approved: ['archived'],
    archived: []
  };

  function readGovernance(){
    try{
      const raw=localStorage.getItem(GOVERNANCE_KEY);
      const value=raw?JSON.parse(raw):{};
      return value&&typeof value==='object'&&!Array.isArray(value)?value:{};
    }catch(e){ return {}; }
  }
  function writeAudit(entry){
    try{
      const raw=localStorage.getItem(AUDIT_KEY);
      const list=raw?JSON.parse(raw):[];
      const next=Array.isArray(list)?list:[];
      next.push({version:VERSION,at:new Date().toISOString(),...entry});
      localStorage.setItem(AUDIT_KEY,JSON.stringify(next.slice(-300)));
    }catch(e){ console.warn('[Phase 4.6.1] audit write failed',e); }
  }
  function fnv(value){
    let h=2166136261;
    const text=String(value??'');
    for(let i=0;i<text.length;i++){ h^=text.charCodeAt(i); h=Math.imul(h,16777619); }
    return (h>>>0).toString(16).padStart(8,'0');
  }
  async function sha256(value){
    const text=String(value??'');
    if(window.crypto?.subtle){
      const bytes=new TextEncoder().encode(text);
      const digest=await crypto.subtle.digest('SHA-256',bytes);
      return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('');
    }
    return fnv(text);
  }
  function canonicalRevision(r){
    if(!r) return '';
    return JSON.stringify({
      revisionId:r.revisionId||null,
      revision:r.revision??null,
      content:r.content??r.body??r.text??'',
      contentHash:r.contentHash||null,
      template:r.template||null,
      templateVersion:r.templateVersion||null,
      source:r.source||null
    });
  }
  function revisionsFor(id){
    const store=window.documentRevisionStoreV42;
    const list=store&&store[id];
    return Array.isArray(list)?list:[];
  }
  function currentPack(){
    if(window.currentPackV43) return window.currentPackV43;
    try{
      const raw=localStorage.getItem('meeting_ai_document_packs_v43');
      const parsed=raw?JSON.parse(raw):{};
      const id=window.currentPackIdV43;
      if(id&&parsed[id]) return parsed[id];
      const ids=Object.keys(parsed||{});
      return ids.length?parsed[ids[ids.length-1]]:null;
    }catch(e){ return null; }
  }
  function packCanonical(pack){
    if(!pack) return '';
    const docs=(pack.documents||[]).slice().sort((a,b)=>String(a.documentId).localeCompare(String(b.documentId)));
    return JSON.stringify({
      packId:pack.packId||null,
      documents:docs.map(d=>({
        documentId:d.documentId||null,
        type:d.type||null,
        contentHash:d.contentHash||null,
        revisionId:d.revisionId||null,
        template:d.template||null,
        source:d.source||null
      }))
    });
  }
  function activeDocumentId(){
    return String(window.currentGeneratedDocument?.documentId||window.getCurrentDocumentIdV42?.()||'');
  }
  function getEntry(id){
    return id ? readGovernance()[id]||null : null;
  }
  function transitionCheck(from,to){
    if(!TRANSITIONS[from]) return {ok:false,reason:'Unknown current lifecycle state.'};
    if(from===to) return {ok:true,reason:'No-op transition.'};
    return TRANSITIONS[from].includes(to)
      ? {ok:true,reason:'Allowed lifecycle transition.'}
      : {ok:false,reason:`Transition ${from} → ${to} is not allowed.`};
  }
  function validateMutation(id,targetStatus){
    const entry=getEntry(id);
    if(!entry) return {ok:true,reason:'No governance record yet; creation is allowed.'};
    const transition=transitionCheck(entry.status,targetStatus);
    if(!transition.ok) return {ok:false,reason:transition.reason,code:'INVALID_TRANSITION'};
    if(entry.locked && targetStatus!=='archived') return {ok:false,reason:'Document is governance-locked.',code:'LOCKED'};
    return {ok:true,reason:'Mutation is governance-compatible.'};
  }
  function approvedRevisionDrift(id){
    const entry=getEntry(id);
    if(!entry?.approvedRevisionId) return {checked:false,ok:true,reason:'No approved revision recorded.'};
    const revisions=revisionsFor(id);
    const approved=revisions.find(r=>r.revisionId===entry.approvedRevisionId);
    if(!approved) return {checked:true,ok:false,reason:'Approved revision is missing from the revision store.',code:'APPROVED_REVISION_MISSING'};
    const canonical=canonicalRevision(approved);
    const currentHash=fnv(canonical);
    const stored=entry.approvedRevisionFingerprint||approved.governanceFingerprint||null;
    if(!stored) return {checked:true,ok:true,reason:'Legacy approval has no fingerprint; cannot prove historical content identity.',code:'LEGACY_NO_FINGERPRINT'};
    return currentHash===stored
      ? {checked:true,ok:true,reason:'Approved revision fingerprint matches.'}
      : {checked:true,ok:false,reason:'Approved revision fingerprint mismatch.',code:'APPROVED_REVISION_DRIFT'};
  }
  async function captureApprovalFingerprint(id){
    const entry=getEntry(id);
    if(!entry?.approvedRevisionId) return {ok:false,reason:'No approved revision.'};
    const revision=revisionsFor(id).find(r=>r.revisionId===entry.approvedRevisionId);
    if(!revision) return {ok:false,reason:'Approved revision not found.'};
    const fingerprint=fnv(canonicalRevision(revision));
    const strongHash=await sha256(canonicalRevision(revision));
    return {ok:true,revisionId:revision.revisionId,fingerprint,sha256:strongHash};
  }
  async function verifyPackIntegrity(){
    const pack=currentPack();
    if(!pack) return {ok:false,reason:'No active Document Pack.',code:'NO_PACK'};
    const canonical=packCanonical(pack);
    const sha=await sha256(canonical);
    const previous=window.phase461LastPackFingerprint||null;
    const result={ok:true,packId:pack.packId||null,fnv:fnv(canonical),sha256:sha,changedSinceLastCheck:previous?previous.sha256!==sha:false};
    window.phase461LastPackFingerprint=result;
    return result;
  }
  async function regressionSelfTest(){
    const checks=[];
    const allowed=transitionCheck('draft','review').ok && transitionCheck('review','approved').ok;
    const forbidden=!transitionCheck('draft','approved').ok && !transitionCheck('archived','draft').ok;
    checks.push(['Lifecycle allowed transitions',allowed]);
    checks.push(['Lifecycle forbidden transitions',forbidden]);
    checks.push(['Deterministic FNV hash',fnv('phase461')===fnv('phase461')]);
    checks.push(['FNV differentiation',fnv('phase461')!==fnv('phase462')]);
    const shaA=await sha256('phase461');
    const shaB=await sha256('phase461');
    checks.push(['SHA-256 deterministic',shaA===shaB&&shaA.length===64]);
    checks.push(['Legacy bridge available',typeof window.restoreDocumentRevisionV42==='function']);
    checks.push(['Governance namespace readable',readGovernance()&&typeof readGovernance()==='object']);
    const pack=await verifyPackIntegrity();
    checks.push(['Pack verification is explicit',pack.ok===true || pack.code==='NO_PACK']);
    const report={phase:VERSION,timestamp:new Date().toISOString(),ok:checks.every(x=>x[1]),checks,pack};
    writeAudit({event:'self_test',ok:report.ok});
    console.groupCollapsed(`[Phase ${VERSION}] ${report.ok?'PASS':'CHECK'}`);
    console.table(checks);
    console.log(report);
    console.groupEnd();
    return report;
  }
  function expose(){
    window.validateGovernanceMutationV461=validateMutation;
    window.transitionCheckV461=transitionCheck;
    window.checkApprovedRevisionDriftV461=approvedRevisionDrift;
    window.captureApprovalFingerprintV461=captureApprovalFingerprint;
    window.verifyPackIntegrityV461=verifyPackIntegrity;
    window.runPhase461RegressionSelfTest=regressionSelfTest;
    window.getPhase461Version=()=>VERSION;
    writeAudit({event:'initialized',documentId:activeDocumentId()||null});
  }
  expose();
})();
