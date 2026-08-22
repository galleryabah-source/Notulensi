/*
 * Meeting Intelligence Ultimate — PHASE 4.6
 * Document Governance, Lifecycle & Audit Hardening
 *
 * Non-destructive addon for Phase 4.2–4.5.
 * - Does not mutate meetingHistory, rawAI, analysis, continuity, or Knowledge Graph.
 * - Keeps revision history immutable; governance stores only document lifecycle metadata.
 * - Adds lifecycle status, approval/lock metadata, audit events, retention metadata,
 *   deterministic pack integrity manifest, and governance self-test.
 */
(function(){
  'use strict';

  const STORAGE_KEY = 'meeting_ai_document_governance_v46';
  const SCHEMA_VERSION = '4.6.0';
  const STATUSES = [
    {id:'draft', label:'Draft'},
    {id:'review', label:'Review'},
    {id:'approved', label:'Approved'},
    {id:'archived', label:'Archived'}
  ];

  let store = {};
  let selectedDocumentId = '';

  function get(){ try { return localStorage.getItem(STORAGE_KEY); } catch(e){ return null; } }
  function set(v){ try { localStorage.setItem(STORAGE_KEY, v); return true; } catch(e){ return false; } }
  function esc(v){
    if(typeof window.escapeHTML === 'function') return window.escapeHTML(v);
    return String(v ?? '').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  }
  function toast(m,t){ if(typeof window.showToast === 'function') window.showToast(m,t||'info'); else console.log('[Phase 4.6]',m); }
  function now(){ return new Date().toISOString(); }
  function load(){
    try{
      const parsed=JSON.parse(get()||'{}');
      store=parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?parsed:{};
    }catch(e){ store={}; console.warn('Phase 4.6 governance store load failed:',e); }
  }
  function save(){ const ok=set(JSON.stringify(store)); if(!ok) console.warn('Phase 4.6 governance store save failed.'); return ok; }
  function hash(value){
    let h=2166136261; const text=String(value??'');
    for(let i=0;i<text.length;i++){ h^=text.charCodeAt(i); h=Math.imul(h,16777619); }
    return (h>>>0).toString(16).padStart(8,'0');
  }
  function slug(value){ return String(value??'Document').replace(/[^a-zA-Z0-9_-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,80)||'Document'; }
  function labelFor(status){ return STATUSES.find(x=>x.id===status)?.label||status; }
  function activePack(){
    if(window.currentPackV43) return window.currentPackV43;
    const packs=window.currentPackIdV43 && typeof window.currentPackIdV43==='string' ? null : null;
    try{
      const raw=localStorage.getItem('meeting_ai_document_packs_v43');
      const parsed=raw?JSON.parse(raw):{};
      const id=window.currentPackIdV43;
      if(id&&parsed[id]) return parsed[id];
      const ids=Object.keys(parsed||{});
      return ids.length?parsed[ids[ids.length-1]]:null;
    }catch(e){ return null; }
  }
  function activeDocument(){
    const pack=activePack();
    const id=selectedDocumentId||window.currentGeneratedDocument?.documentId||'';
    if(pack?.documents?.length){
      const byId=pack.documents.slice().reverse().find(x=>x.documentId===id);
      if(byId) return byId;
      const byType=window.currentGeneratedDocument?.type ? pack.documents.slice().reverse().find(x=>x.type===window.currentGeneratedDocument.type) : null;
      if(byType) return byType;
    }
    const current=window.currentGeneratedDocument;
    return current?.documentId ? current : null;
  }
  function documentId(d){ return String(d?.documentId||window.getCurrentDocumentIdV42?.()||''); }
  function entryFor(id,create){
    if(!id) return null;
    if(!store[id] && create){
      store[id]={
        schemaVersion:SCHEMA_VERSION,
        documentId:id,
        status:'draft',
        locked:false,
        approvedRevisionId:null,
        approvedAt:null,
        approvedBy:null,
        retentionUntil:null,
        createdAt:now(),
        updatedAt:now(),
        audit:[]
      };
      audit(id,'created',{status:'draft'});
      save();
    }
    return store[id]||null;
  }
  function audit(id,event,details){
    const e=store[id]; if(!e) return;
    if(!Array.isArray(e.audit)) e.audit=[];
    e.audit.push({event,at:now(),actor:'local-user',details:details||{}});
    if(e.audit.length>200) e.audit=e.audit.slice(-200);
    e.updatedAt=now();
  }
  function setStatus(status){
    if(!STATUSES.some(x=>x.id===status)) return toast('Status governance tidak valid.','error');
    const d=activeDocument(); const id=documentId(d); if(!id) return toast('Belum ada dokumen aktif.','warning');
    const e=entryFor(id,true);
    if(e.locked && status!=='archived') return toast('Dokumen terkunci setelah approval. Buka kunci terlebih dahulu untuk mengubah lifecycle.','warning');
    const old=e.status; e.status=status;
    if(status==='approved'){
      const revisions=window.documentRevisionStoreV42?.[id]||[];
      const latest=revisions[revisions.length-1];
      e.approvedRevisionId=latest?.revisionId||d.revisionId||null;
      e.approvedAt=now();
      e.approvedBy='local-user';
      e.locked=true;
      audit(id,'approved',{from:old,revisionId:e.approvedRevisionId});
    }else if(status==='archived'){
      audit(id,'archived',{from:old});
    }else{
      audit(id,'status_changed',{from:old,to:status});
    }
    e.schemaVersion=SCHEMA_VERSION; save(); render();
    toast(`${d.label||'Dokumen'} → ${labelFor(status)}.`,'success');
    return e;
  }
  function unlock(){
    const d=activeDocument(); const id=documentId(d); if(!id) return toast('Belum ada dokumen aktif.','warning');
    const e=entryFor(id,true); e.locked=false; audit(id,'unlocked',{}); save(); render();
    toast('Governance lock dibuka.','success'); return e;
  }
  function setRetention(days){
    const d=activeDocument(); const id=documentId(d); if(!id) return toast('Belum ada dokumen aktif.','warning');
    const n=Number(days); if(!Number.isInteger(n)||n<0||n>36500) return toast('Retention harus 0–36500 hari.','error');
    const e=entryFor(id,true);
    e.retentionUntil=new Date(Date.now()+n*86400000).toISOString();
    audit(id,'retention_set',{days:n,retentionUntil:e.retentionUntil});
    save(); render(); toast(`Retention metadata diset ${n} hari.`,'success'); return e;
  }
  function ensureCurrentRevision(){
    const d=activeDocument(); const id=documentId(d); if(!id) return null;
    const revisions=window.documentRevisionStoreV42?.[id]||[];
    return revisions[revisions.length-1]||null;
  }
  function integrityManifest(){
    const pack=activePack();
    const docs=(pack?.documents||[]).slice().sort((a,b)=>String(a.documentId).localeCompare(String(b.documentId)));
    const items=docs.map(d=>{
      const revisions=(window.documentRevisionStoreV42?.[d.documentId]||[]).slice().sort((a,b)=>Number(a.revision)-Number(b.revision));
      return {
        documentId:d.documentId,
        type:d.type,
        contentHash:d.contentHash,
        revisionIds:revisions.map(r=>r.revisionId),
        revisionHashes:revisions.map(r=>r.contentHash),
        template:d.template||null,
        source:{meetingId:d.source?.meetingId||null,transcriptHash:d.source?.transcriptHash||null,analysisHash:d.source?.analysisHash||null}
      };
    });
    const canonical=JSON.stringify({packId:pack?.packId||null,items});
    return {
      schemaVersion:SCHEMA_VERSION,
      generatedAt:now(),
      packId:pack?.packId||null,
      documentCount:items.length,
      integrityHash:hash(canonical),
      items
    };
  }
  function verifyIntegrity(){
    const manifest=integrityManifest();
    const checks=[];
    const pack=activePack();
    checks.push(['Pack available',!!pack]);
    checks.push(['Documents structurally valid',manifest.items.every(x=>x.documentId&&x.contentHash)]);
    checks.push(['Revision linkage valid',manifest.items.every(x=>x.revisionIds.length===0||x.revisionIds.length===x.revisionHashes.length)]);
    checks.push(['Integrity hash generated',Boolean(manifest.integrityHash)]);
    const ok=checks.every(x=>x[1]);
    const out=document.getElementById('v46IntegrityResult');
    if(out) out.innerHTML=`<div class="font-semibold ${ok?'text-emerald-300':'text-amber-300'}">${ok?'INTEGRITY PASS':'INTEGRITY CHECK'}</div><div class="text-[10px] text-slate-500 mt-1">${esc(manifest.integrityHash)} · ${manifest.documentCount} dokumen</div>${checks.map(x=>`<div class="text-[10px] mt-1">${x[1]?'✓':'⚠'} ${esc(x[0])}</div>`).join('')}`;
    return {ok,checks,manifest};
  }
  function exportGovernance(){
    const pack=activePack();
    if(!pack) return toast('Belum ada Document Pack.','warning');
    const ids=(pack.documents||[]).map(d=>d.documentId);
    const governance=ids.map(id=>entryFor(id,true));
    const payload={schemaVersion:SCHEMA_VERSION,exportedAt:now(),packId:pack.packId,integrity:integrityManifest(),documents:governance};
    const name=`Governance_${slug(pack.source?.title)}_${pack.packId}.json`;
    const text=JSON.stringify(payload,null,2);
    if(typeof window.downloadFile==='function') window.downloadFile(text,name,'application/json');
    else{ const u=URL.createObjectURL(new Blob([text],{type:'application/json'})); const a=document.createElement('a'); a.href=u; a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(u),1000); }
    return payload;
  }
  function render(){
    const d=activeDocument(); const id=documentId(d); const e=entryFor(id,Boolean(id));
    const status=document.getElementById('v46Status'); if(status) status.textContent=d ? `${d.label||'Dokumen'} · ${labelFor(e?.status||'draft')}${e?.locked?' · 🔒':''}` : 'Belum ada dokumen aktif';
    const select=document.getElementById('v46Lifecycle');
    if(select){ select.innerHTML=STATUSES.map(s=>`<option value="${s.id}" ${s.id===(e?.status||'draft')?'selected':''}>${s.label}</option>`).join(''); select.disabled=Boolean(e?.locked); }
    const lock=document.getElementById('v46LockState'); if(lock) lock.textContent=e?.locked?'LOCKED':'UNLOCKED';
    const rev=document.getElementById('v46ApprovedRevision'); if(rev) rev.textContent=e?.approvedRevisionId||'—';
    const retention=document.getElementById('v46Retention'); if(retention) retention.textContent=e?.retentionUntil?new Date(e.retentionUntil).toLocaleString('id-ID'):'Tidak diset';
    const auditBox=document.getElementById('v46Audit');
    if(auditBox){ const a=e?.audit||[]; auditBox.innerHTML=a.length?a.slice().reverse().slice(0,12).map(x=>`<div class="border-b border-slate-800 py-1.5"><div class="flex justify-between gap-2"><b class="text-[10px] text-slate-300">${esc(x.event)}</b><span class="text-[9px] text-slate-600">${esc(new Date(x.at).toLocaleString('id-ID'))}</span></div><div class="text-[9px] text-slate-500 break-all">${esc(JSON.stringify(x.details||{}))}</div></div>`).join(''):'<span class="text-slate-600 italic">Belum ada audit event.</span>'; }
    verifyIntegrity();
  }
  function inject(){
    if(document.getElementById('phase46GovernancePanel')) return true;
    const host=document.getElementById('docsTab'); if(!host) return false;
    const p=document.createElement('section'); p.id='phase46GovernancePanel'; p.className='bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl mt-4';
    p.innerHTML=`<div class="flex flex-col lg:flex-row lg:justify-between gap-3 mb-4"><div><h3 class="font-semibold text-slate-100">Phase 4.6 · Document Governance</h3><p id="v46Status" class="text-[11px] text-slate-500 mt-1">Memuat…</p></div><div class="flex flex-wrap gap-2"><button onclick="window.exportGovernanceV46()" class="px-2.5 py-1.5 bg-indigo-700 rounded-lg text-[11px]">Governance JSON</button><button onclick="window.verifyIntegrityV46()" class="px-2.5 py-1.5 bg-slate-800 rounded-lg text-[11px]">Verify Integrity</button></div></div><div class="grid grid-cols-1 xl:grid-cols-3 gap-4"><div><div class="text-xs font-semibold mb-2">Lifecycle</div><select id="v46Lifecycle" class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs"><option>Draft</option></select><button onclick="window.applyGovernanceStatusV46()" class="w-full mt-2 px-3 py-2 bg-indigo-700 rounded-lg text-[11px]">Terapkan Status</button><button onclick="window.unlockGovernanceV46()" class="w-full mt-2 px-3 py-2 bg-slate-800 rounded-lg text-[11px]">Buka Governance Lock</button></div><div><div class="text-xs font-semibold mb-2">Approval & Retention</div><div class="text-[10px] space-y-1"><div class="flex justify-between gap-2"><span class="text-slate-500">Lock</span><span id="v46LockState">—</span></div><div class="flex justify-between gap-2"><span class="text-slate-500">Approved Revision</span><span id="v46ApprovedRevision" class="break-all text-right">—</span></div><div class="flex justify-between gap-2"><span class="text-slate-500">Retention Until</span><span id="v46Retention" class="text-right">—</span></div></div><div class="flex gap-2 mt-3"><input id="v46RetentionDays" type="number" min="0" max="36500" value="365" class="min-w-0 flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-[11px]"><button onclick="window.setRetentionV46()" class="px-2.5 py-1.5 bg-slate-800 rounded-lg text-[11px]">Set hari</button></div></div><div><div class="text-xs font-semibold mb-2">Integrity</div><div id="v46IntegrityResult" class="bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] text-slate-500">Memuat…</div></div></div><div class="mt-4"><div class="text-xs font-semibold mb-2">Audit Trail</div><div id="v46Audit" class="max-h-56 overflow-auto bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px]">Memuat…</div></div>`;
    host.appendChild(p); return true;
  }
  function selfTest(){
    const checks=[];
    checks.push(['Governance store object',store&&typeof store==='object'&&!Array.isArray(store)]);
    checks.push(['Lifecycle schema',STATUSES.length===4&&STATUSES.every(x=>x.id&&x.label)]);
    checks.push(['Deterministic hash',hash('abc')===hash('abc')]);
    checks.push(['Hash differentiation',hash('abc')!==hash('abd')]);
    checks.push(['Integrity manifest',!!integrityManifest().integrityHash]);
    checks.push(['Legacy revision bridge',typeof window.restoreDocumentRevisionV42==='function']);
    checks.push(['Document Pack bridge',typeof window.currentPackIdV43!=='undefined'||!!activePack()]);
    const ok=checks.every(x=>x[1]); const report={phase:'4.6',timestamp:now(),ok,results:checks,storageKey:STORAGE_KEY};
    console.groupCollapsed(`Phase 4.6 Governance: ${ok?'PASS':'CHECK'}`); console.table(checks); console.log(report); console.groupEnd();
    return report;
  }
  function init(){
    load();
    window.applyGovernanceStatusV46=function(){ const s=document.getElementById('v46Lifecycle')?.value||'draft'; setStatus(s); };
    window.unlockGovernanceV46=unlock;
    window.setRetentionV46=function(){ setRetention(document.getElementById('v46RetentionDays')?.value||365); };
    window.exportGovernanceV46=exportGovernance;
    window.verifyIntegrityV46=verifyIntegrity;
    window.runPhase46SelfTest=selfTest;
    window.refreshPhase46Governance=render;
    window.selectGovernanceDocumentV46=function(id){ selectedDocumentId=String(id||''); render(); };
    const run=()=>{ inject(); render(); };
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run,{once:true}); else run();
    setTimeout(run,500); setTimeout(run,1500);
  }
  init();
})();
