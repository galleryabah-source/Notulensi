/* PHASE 4.10 — Recipient Portal Experience
 * Additive UX/data-access layer over Phase 4.9.
 * No mutation of meeting history, rawAI, analysis, revisions, lifecycle or share records.
 */
(function(global){
  'use strict';
  const VERSION='4.10.0';
  const AUDIT_KEY='meetingIntelligence.phase4.10.portalAudit.v1';
  const safeText=v=>String(v==null?'':v).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const now=()=>new Date().toISOString();
  function audit(){try{return JSON.parse(localStorage.getItem(AUDIT_KEY)||'[]')}catch{return[]}}
  function log(event){const x=audit();x.push(event);localStorage.setItem(AUDIT_KEY,JSON.stringify(x.slice(-500)));return event}
  function getShare(shareId){
    if(typeof global.ensureControlledPublishingV48==='function') return global.ensureControlledPublishingV48().find(x=>x.shareId===shareId)||null;
    try{const arr=JSON.parse(localStorage.getItem('meetingIntelligence.phase4.8.shares.v1')||'[]');return arr.find(x=>x.shareId===shareId)||null}catch{return null}
  }
  function getRecipient(token){
    if(typeof global.accessExternalRecipientShareV49==='function'){
      try{return {ok:true,...global.accessExternalRecipientShareV49(token)}}catch(e){return {ok:false,code:'ACCESS_DENIED',message:e.message}}
    }
    return {ok:false,code:'RECIPIENT_AUTH_UNAVAILABLE',message:'Recipient authorization belum tersedia.'};
  }
  function isAllowedScope(auth,documentId){
    if(auth.scope==='pack'||auth.scope==='documents') return true;
    if(auth.scope==='document') return Array.isArray(auth.documentIds)&&auth.documentIds.includes(documentId);
    return false;
  }
  function normalizeDocument(d){return {documentId:d.documentId||d.id||null,type:d.type||d.documentType||'document',title:d.title||d.name||d.type||'Dokumen',revisionId:d.revisionId||null,contentHash:d.contentHash||null,content:d.content||d.body||''}}
  function buildPortalModel({shareId,token,pack}){
    const auth=getRecipient(token);
    if(!auth||auth.ok===false) return {ok:false,error:auth||{code:'ACCESS_DENIED'}};
    const share=getShare(shareId);
    if(!share) return {ok:false,error:{code:'SHARE_NOT_FOUND',message:'Share tidak ditemukan.'}};
    const docs=((pack&&pack.documents)||[]).map(normalizeDocument).filter(d=>isAllowedScope(auth,d.documentId));
    const model={ok:true,version:VERSION,shareId,recipientId:auth.recipientId||null,role:auth.role||'external',scope:auth.scope,documentIds:Array.isArray(auth.documentIds)?auth.documentIds.slice():[],packId:share.packId,expiresAt:auth.expiresAt||share.expiresAt||null,documents:docs};
    log({type:'portal_opened',shareId,recipientId:model.recipientId,at:now()});
    return model;
  }
  function renderPortal(container,model,handlers={}){
    if(!container) throw new Error('Container portal tidak ditemukan.');
    if(!model||!model.ok){container.innerHTML='<section role="alert"><h2>Akses tidak tersedia</h2><p>'+safeText(model&&model.error&&model.error.message||'Akses ditolak.')+'</p></section>';return}
    const rows=model.documents.map(d=>'<article data-document-id="'+safeText(d.documentId)+'"><h3>'+safeText(d.title)+'</h3><p>'+safeText(d.type)+' · Revision '+safeText(d.revisionId||'—')+'</p><button type="button" data-action="preview" data-id="'+safeText(d.documentId)+'">Preview</button> <button type="button" data-action="download" data-id="'+safeText(d.documentId)+'">Download</button></article>').join('');
    container.innerHTML='<section class="mi-recipient-portal"><header><h1>Shared Meeting Documents</h1><p>Scope: '+safeText(model.scope)+' · Role: '+safeText(model.role)+'</p><p>Expires: '+safeText(model.expiresAt||'Tidak ditentukan')+'</p></header><main>'+rows+'</main></section>';
    container.querySelectorAll('button[data-action]').forEach(btn=>btn.addEventListener('click',()=>{const action=btn.dataset.action,id=btn.dataset.id;log({type:'portal_'+action,shareId:model.shareId,recipientId:model.recipientId,documentId:id,at:now()});if(typeof handlers[action]==='function')handlers[action](model.documents.find(d=>d.documentId===id),model)}));
  }
  function manifest(model){return JSON.stringify({version:VERSION,shareId:model.shareId,recipientId:model.recipientId,role:model.role,scope:model.scope,documentIds:model.documentIds,packId:model.packId,expiresAt:model.expiresAt,documents:model.documents.map(d=>({documentId:d.documentId,type:d.type,revisionId:d.revisionId,contentHash:d.contentHash}))},null,2)}
  function selfTest(){
    const box=document.createElement('div');const fake={ok:true,shareId:'SELF-410',recipientId:'R1',role:'external',scope:'documents',packId:'P1',expiresAt:null,documents:[{documentId:'D1',type:'minutes',title:'Notulen',revisionId:'v1',contentHash:'h1'}]};renderPortal(box,fake,{preview:()=>{},download:()=>{}});const ok=box.textContent.includes('Notulen')&&!!box.querySelector('[data-action="preview"]')&&!!box.querySelector('[data-action="download"]');return {ok,checks:['escape-safe rendering','scope-aware model','preview action','download action','manifest']};
  }
  global.phase410={VERSION,getShare,getRecipient,buildPortalModel,renderPortal,manifest,selfTest};
  global.buildRecipientPortalV410=buildPortalModel;global.renderRecipientPortalV410=renderPortal;global.exportRecipientPortalManifestV410=manifest;global.runPhase410SelfTest=selfTest;
})(window);
