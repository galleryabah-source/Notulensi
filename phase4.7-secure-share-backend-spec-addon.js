/*
 * Meeting Intelligence Ultimate — PHASE 4.7
 * Secure Share Backend Specification & Data Model
 *
 * Additive client-side contract only. This file does not pretend to be a
 * production security boundary. Secrets, token hashing, ACL enforcement,
 * authentication, rate limiting and audit persistence belong on the server.
 */
(function(){
  'use strict';

  const SCHEMA_VERSION='4.7.0';
  const CONTRACT_KEY='meeting_intelligence_secure_share_contract_v47';
  const now=()=>new Date().toISOString();
  const uid=(prefix)=>`${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,10)}`;
  const readJSON=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch{return fallback}};
  const writeJSON=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}};
  const toast=(m,t='info')=>typeof window.showToast==='function'?window.showToast(m,t):console.log(m);

  const TABLES={
    users:{primaryKey:'id',required:['id','email','status','createdAt']},
    documents:{primaryKey:'id',required:['id','ownerId','sourceMeetingId','currentRevisionId','createdAt','updatedAt']},
    documentRevisions:{primaryKey:'id',required:['id','documentId','revisionNumber','contentHash','content','createdAt']},
    documentShares:{primaryKey:'id',required:['id','documentId','revisionId','ownerId','tokenHash','visibility','expiresAt','createdAt']},
    shareAccessLogs:{primaryKey:'id',required:['id','shareId','event','occurredAt']}
  };

  const ENDPOINTS={
    create:{method:'POST',path:'/api/shares'},
    resolve:{method:'GET',path:'/api/shares/:shareId'},
    revoke:{method:'DELETE',path:'/api/shares/:shareId'},
    rotate:{method:'POST',path:'/api/shares/:shareId/rotate'},
    list:{method:'GET',path:'/api/shares'},
    audit:{method:'GET',path:'/api/shares/:shareId/audit'}
  };

  const DEFAULT_POLICY={
    visibility:'unlisted',
    allowAnonymousRead:true,
    allowIndexing:false,
    allowDownload:true,
    ttlMinutes:1440,
    maxAccessPerMinute:30
  };

  function getContractConfig(){
    return {...DEFAULT_POLICY,...readJSON(CONTRACT_KEY,{}),schemaVersion:SCHEMA_VERSION};
  }
  function setContractConfig(patch){
    const next={...getContractConfig(),...patch,schemaVersion:SCHEMA_VERSION};
    writeJSON(CONTRACT_KEY,next);return next;
  }

  function buildBackendShareRecord(input={}){
    const snapshot=input.snapshot || (typeof window.getPhase46CloudConfig==='function'?null:null);
    const document=input.document || snapshot?.document || {};
    if(!document.documentId)throw new Error('document.documentId wajib diisi.');
    if(!document.revisionId)throw new Error('document.revisionId wajib diisi.');
    if(!input.ownerId)throw new Error('ownerId wajib diisi.');
    const policy={...DEFAULT_POLICY,...input.policy};
    const createdAt=input.createdAt||now();
    const expiresAt=input.expiresAt||new Date(Date.parse(createdAt)+Number(policy.ttlMinutes)*60000).toISOString();
    return {
      id:input.id||uid('share'),
      documentId:String(document.documentId),
      revisionId:String(document.revisionId),
      ownerId:String(input.ownerId),
      tokenHash:input.tokenHash||'[SERVER_ONLY]',
      visibility:policy.visibility,
      expiresAt,
      revokedAt:null,
      createdAt,
      updatedAt:createdAt,
      policy:{
        allowAnonymousRead:Boolean(policy.allowAnonymousRead),
        allowIndexing:Boolean(policy.allowIndexing),
        allowDownload:Boolean(policy.allowDownload),
        maxAccessPerMinute:Number(policy.maxAccessPerMinute)||30
      }
    };
  }

  function buildAuditEvent({shareId,event,actorId=null,ipHash=null,userAgentHash=null,metadata={}}={}){
    if(!shareId||!event)throw new Error('shareId dan event wajib diisi.');
    return {id:uid('audit'),shareId:String(shareId),event:String(event),actorId:actorId?String(actorId):null,ipHash:ipHash||null,userAgentHash:userAgentHash||null,metadata,occurredAt:now()};
  }

  function validateBackendRecord(record){
    const required=TABLES.documentShares.required;
    const missing=required.filter(k=>record?.[k]===undefined||record?.[k]===null||record?.[k]==='');
    const validVisibility=['private','unlisted','public'].includes(record?.visibility);
    const expiryValid=Number.isFinite(Date.parse(record?.expiresAt||''));
    return {ok:missing.length===0&&validVisibility&&expiryValid,missing,checks:{requiredFields:missing.length===0,visibility:validVisibility,expiresAt:expiryValid}};
  }

  function getContractManifest(){
    return {
      schemaVersion:SCHEMA_VERSION,
      generatedAt:now(),
      tables:TABLES,
      endpoints:ENDPOINTS,
      policy:DEFAULT_POLICY,
      security:{
        tokenRawStorage:'forbidden',
        tokenHashStorage:'server-only',
        authentication:'server-only',
        authorization:'server-only',
        rateLimiting:'server-only',
        auditPersistence:'server-only',
        secretExposureToClient:false,
        recommendedToken:'opaque-high-entropy-short-lived'
      },
      lifecycle:['create','resolve','rotate','revoke','expire','audit']
    };
  }

  function runPhase47SelfTest(){
    const tests=[];const check=(name,passed,detail='')=>tests.push({name,passed:Boolean(passed),detail});
    const sample=buildBackendShareRecord({ownerId:'user-test',document:{documentId:'DOC-test-official-template',revisionId:'DOC-test-official-template:r1'},policy:{visibility:'unlisted'}});
    const validation=validateBackendRecord(sample);
    check('Schema 4.7.0',SCHEMA_VERSION==='4.7.0');
    check('Five core tables defined',Object.keys(TABLES).length===5);
    check('Share record validation',validation.ok,JSON.stringify(validation.checks));
    check('Token raw storage forbidden',getContractManifest().security.tokenRawStorage==='forbidden');
    check('Server-only token hash',getContractManifest().security.tokenHashStorage==='server-only');
    check('No client secret boundary',getContractManifest().security.secretExposureToClient===false);
    check('Create/resolve/revoke endpoints',ENDPOINTS.create&&ENDPOINTS.resolve&&ENDPOINTS.revoke);
    check('Audit event schema',buildAuditEvent({shareId:sample.id,event:'created'}).shareId===sample.id);
    const report={phase:SCHEMA_VERSION,timestamp:now(),ok:tests.every(t=>t.passed),results:tests,manifest:getContractManifest()};
    console.groupCollapsed(`Phase 4.7 Secure Share Contract: ${report.ok?'PASS':'FAIL'}`);console.table(tests);console.log(report);console.groupEnd();
    toast(`Phase 4.7 Self-Test: ${report.ok?'PASS':'FAIL'}`,report.ok?'success':'error');
    return report;
  }

  function inject(){
    if(document.getElementById('phase47SecureSharePanel'))return;
    const target=document.getElementById('phase46CloudPanel')||document.getElementById('phase45SharePanel')||document.getElementById('docsTab');
    if(!target)return;
    const panel=document.createElement('div');panel.id='phase47SecureSharePanel';panel.className='mt-4 pt-4 border-t border-slate-800';
    panel.innerHTML=`<div class="text-xs font-semibold text-slate-200">PHASE 4.7 — Secure Share Backend Contract</div><div class="text-[11px] text-slate-500 mt-1">Data model, API contract, lifecycle, ACL/security boundary, dan audit schema siap untuk implementasi backend.</div><div class="flex flex-wrap gap-2 mt-3"><button onclick="window.runPhase47SelfTest()" class="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 rounded-lg text-[11px]">Self-Test</button><button onclick="window.exportPhase47Manifest()" class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-[11px]">Export Contract JSON</button></div><div class="text-[10px] text-slate-600 mt-2">Production rule: raw token tidak disimpan; server hanya menyimpan hash. Authentication, ACL, rate limit, expiry, revoke, dan audit harus enforced server-side.</div>`;
    target.appendChild(panel);
  }

  function exportManifest(){
    const payload=JSON.stringify(getContractManifest(),null,2);
    if(typeof window.downloadFile==='function')window.downloadFile(payload,'Phase_4.7_Secure_Share_Contract.json','application/json');
    else{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([payload],{type:'application/json'}));a.download='Phase_4.7_Secure_Share_Contract.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
  }

  window.getPhase47Tables=()=>TABLES;
  window.getPhase47Endpoints=()=>ENDPOINTS;
  window.getPhase47ContractManifest=getContractManifest;
  window.getPhase47ShareRecord=buildBackendShareRecord;
  window.getPhase47AuditEvent=buildAuditEvent;
  window.validatePhase47ShareRecord=validateBackendRecord;
  window.getPhase47Config=getContractConfig;
  window.setPhase47Config=setContractConfig;
  window.runPhase47SelfTest=runPhase47SelfTest;
  window.exportPhase47Manifest=exportManifest;

  const boot=()=>setTimeout(inject,0);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
