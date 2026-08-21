/*
 * Meeting Intelligence Ultimate — PHASE 4.3.1
 * Document Pack Revision Management
 *
 * Non-destructive addon for Phase 4.3.
 * Keeps a separate revision ledger and never rewrites meeting history,
 * raw AI, analysis, continuity state, Knowledge Graph, or the Phase 4.2 store.
 */
(function(){
  'use strict';

  const STORAGE_KEY='meeting_ai_document_pack_revisions_v431';
  const SCHEMA_VERSION='4.3.1';
  const TYPES=Array.isArray(window.phase43DocumentTypes) ? window.phase43DocumentTypes.slice() : [];
  let ledger={};
  let selectedDocumentId='';

  const get=k=>{try{return localStorage.getItem(k)}catch(e){return null}};
  const set=(k,v)=>{try{localStorage.setItem(k,v);return true}catch(e){return false}};
  const esc=v=>typeof window.escapeHTML==='function'?window.escapeHTML(v):String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));
  const toast=(m,t='info')=>typeof window.showToast==='function'?window.showToast(m,t):console.log(m);
  const hash=value=>{let h=2166136261,s=String(value??'');for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0).toString(16).padStart(8,'0')};

  function load(){try{const x=JSON.parse(get(STORAGE_KEY)||'{}');ledger=x&&typeof x==='object'&&!Array.isArray(x)?x:{}}catch(e){ledger={}}}
  function save(){set(STORAGE_KEY,JSON.stringify(ledger))}
  function pack(){return window.documentPackStoreV43 && Object.values(window.documentPackStoreV43).find(p=>p?.packId===window.__phase431CurrentPackId) || null}
  function allPacks(){return Object.values(window.documentPackStoreV43||{})}
  function currentPack(){
    const packs=allPacks();
    return packs.find(p=>p?.packId===window.__phase431CurrentPackId) || packs[0] || null;
  }
  function docKey(d){return `${d?.packId||'pack'}::${d?.documentId||'document'}`}
  function nextRevision(key){return ((ledger[key]?.revisions||[]).length||0)+1}

  function snapshotDocument(d,forcedRevision){
    if(!d?.documentId || !d?.content) return null;
    const key=docKey(d), contentHash=hash(d.content);
    const entry=ledger[key] || {
      schemaVersion:SCHEMA_VERSION,
      packId:d.packId,
      documentId:d.documentId,
      type:d.type,
      label:d.label,
      title:d.title,
      revisions:[],
      currentRevisionId:null,
      createdAt:new Date().toISOString(),
      updatedAt:new Date().toISOString()
    };
    const same=entry.revisions.find(r=>r.contentHash===contentHash && r.template?.version===d.template?.version);
    if(same){entry.currentRevisionId=same.revisionId;entry.updatedAt=new Date().toISOString();ledger[key]=entry;return same}
    const n=forcedRevision || nextRevision(key);
    const revision={
      revisionId:`${d.documentId}-v${n}`,
      revision:n,
      packId:d.packId,
      documentId:d.documentId,
      type:d.type,
      label:d.label,
      title:d.title,
      content:String(d.content),
      contentHash,
      source:{...(d.source||{})},
      template:{...(d.template||{})},
      phase42Revision:d.revision ? {...d.revision} : null,
      generationMode:d.generationMode||'document-pack',
      generatedAt:d.generatedAt||new Date().toISOString(),
      capturedAt:new Date().toISOString()
    };
    entry.revisions.push(revision);
    entry.currentRevisionId=revision.revisionId;
    entry.updatedAt=new Date().toISOString();
    ledger[key]=entry;
    return revision;
  }

  function syncFromPacks(){
    for(const p of allPacks()) for(const d of (p?.documents||[])) snapshotDocument(d);
    save();
  }

  function currentEntry(documentId=selectedDocumentId){
    const p=currentPack();
    if(!p) return null;
    const key=`${p.packId}::${documentId}`;
    return ledger[key]||null;
  }

  function restoreRevision(revisionId){
    const entries=Object.values(ledger);
    let found=null;
    for(const e of entries){const r=(e.revisions||[]).find(x=>x.revisionId===revisionId);if(r){found=r;break}}
    if(!found) return toast('Revision tidak ditemukan.','error');
    const p=currentPack();
    if(!p) return toast('Document Pack tidak tersedia.','error');
    const d=(p.documents||[]).find(x=>x.documentId===found.documentId);
    if(!d) return toast('Dokumen sumber revision tidak ditemukan dalam pack.','error');

    d.content=found.content;
    d.contentHash=found.contentHash;
    d.revision={
      ...(d.revision||{}),
      revisionId:found.phase42Revision?.revisionId||found.revisionId,
      revision:found.phase42Revision?.revision||found.revision,
      documentId:d.documentId,
      contentHash:found.contentHash
    };
    d.restoredFromRevisionId=found.revisionId;
    d.restoredAt=new Date().toISOString();

    const store=window.documentPackStoreV43||{};
    store[p.packId]=p;
    try{localStorage.setItem('meeting_ai_document_packs_v43',JSON.stringify(store))}catch(e){}
    const entry=ledger[docKey(d)];
    if(entry) entry.currentRevisionId=found.revisionId;
    save();

    window.__phase431CurrentPackId=p.packId;
    selectedDocumentId=d.documentId;
    if(typeof window.selectDocumentPackDocumentV43==='function') window.selectDocumentPackDocumentV43(d.documentId);
    render();
    toast(`${found.label} dikembalikan ke ${found.revisionId}. History tetap dipertahankan.`,'success');
    return found;
  }

  function selectDocument(documentId){
    selectedDocumentId=documentId;
    const entry=currentEntry(documentId);
    if(!entry) return toast('Belum ada revision ledger untuk dokumen ini.','warning');
    render();
  }

  function exportManifest(){
    const p=currentPack();
    const entries=Object.values(ledger).filter(e=>!p || e.packId===p.packId);
    const manifest={schemaVersion:SCHEMA_VERSION,packId:p?.packId||null,exportedAt:new Date().toISOString(),documents:entries};
    const payload=JSON.stringify(manifest,null,2);
    const name=`DocumentPackRevisionManifest_${String(p?.packId||'all').replace(/[^a-zA-Z0-9_-]+/g,'_')}.json`;
    if(typeof window.downloadFile==='function') window.downloadFile(payload,name,'application/json');
    else if(typeof window.download==='function') window.download(payload,name,'application/json');
    return manifest;
  }

  function render(){
    const host=document.getElementById('phase431RevisionPanel');
    if(!host) return;
    const p=currentPack();
    if(!p){host.innerHTML='<p class="text-xs text-slate-500 italic">Belum ada Document Pack untuk revision management.</p>';return}
    const docs=(p.documents||[]).reduce((a,d)=>{if(!a.some(x=>x.documentId===d.documentId))a.push(d);return a},[]);
    const cards=docs.map(d=>{
      const e=ledger[docKey(d)]||{revisions:[]};
      const current=e.currentRevisionId ? e.revisions.find(r=>r.revisionId===e.currentRevisionId) : e.revisions[e.revisions.length-1];
      return `<button onclick="window.selectPhase431Document(${JSON.stringify(d.documentId)})" class="text-left bg-slate-950 border ${selectedDocumentId===d.documentId?'border-indigo-500':'border-slate-800'} rounded-xl p-3 hover:border-indigo-400"><div class="text-xs font-semibold text-slate-200">${esc(d.label)}</div><div class="text-[11px] text-slate-500 mt-1">${e.revisions.length} revision · current ${esc(current?.revisionId||'—')}</div></button>`;
    }).join('');
    const e=currentEntry();
    const history=(e?.revisions||[]).slice().reverse().map(r=>`<div class="bg-slate-950 border border-slate-800 rounded-xl p-3"><div class="flex items-center justify-between gap-3"><div><div class="text-xs font-semibold text-slate-200">${esc(r.revisionId)}</div><div class="text-[10px] text-slate-500 mt-1">${esc(new Date(r.capturedAt||r.generatedAt).toLocaleString('id-ID'))} · hash ${esc(r.contentHash)} · template v${esc(r.template?.version||'?')}</div></div><button onclick="window.restorePhase431Revision(${JSON.stringify(r.revisionId)})" class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-[11px]">Muat</button></div><div class="text-[10px] text-indigo-400 mt-2">${r.phase42Revision?.revisionId?'Phase 4.2: '+esc(r.phase42Revision.revisionId):'Phase 4.2: snapshot tidak tersedia'}</div></div>`).join('');
    host.innerHTML=`<div class="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">${cards}</div><div class="flex items-center justify-between gap-3 mb-2"><div class="text-xs font-semibold text-slate-300">Revision Timeline ${e?`· ${esc(e.label)}`:''}</div><div class="flex gap-2"><button onclick="window.syncPhase431Revisions()" class="px-2.5 py-1.5 bg-slate-800 rounded-lg text-[11px]">Sync</button><button onclick="window.exportPhase431RevisionManifest()" class="px-2.5 py-1.5 bg-slate-800 rounded-lg text-[11px]">Manifest JSON</button></div></div><div class="space-y-2">${history||'<p class="text-xs text-slate-500 italic">Pilih dokumen untuk melihat revision timeline.</p>'}</div>`;
  }

  function inject(){
    if(document.getElementById('phase431RevisionPanel')) return;
    const target=document.getElementById('phase43PackPanel');
    if(!target) return;
    const panel=document.createElement('div');
    panel.id='phase431RevisionPanel';
    panel.className='mt-4 pt-4 border-t border-slate-800';
    target.appendChild(panel);
    syncFromPacks();
    render();
  }

  function selfTest(){
    syncFromPacks();
    const tests=[],c=(name,passed,detail='')=>tests.push({name,passed:Boolean(passed),detail});
    c('Schema 4.3.1',SCHEMA_VERSION==='4.3.1');
    c('Separate revision store',STORAGE_KEY==='meeting_ai_document_pack_revisions_v431');
    c('Pack source store preserved',localStorage.getItem('meeting_ai_document_packs_v43')!==null || Object.keys(window.documentPackStoreV43||{}).length===0);
    c('Revision arrays valid',Object.values(ledger).every(e=>Array.isArray(e.revisions)));
    c('Revision IDs unique',Object.values(ledger).every(e=>{const ids=e.revisions.map(r=>r.revisionId);return ids.length===new Set(ids).size}));
    c('Content hashes deterministic',Object.values(ledger).every(e=>e.revisions.every(r=>r.contentHash===hash(r.content))));
    c('No duplicate content revisions',Object.values(ledger).every(e=>{const keys=e.revisions.map(r=>r.contentHash+'::'+(r.template?.version||''));return keys.length===new Set(keys).size}));
    c('Restore API',typeof window.restorePhase431Revision==='function');
    const report={phase:'4.3.1',timestamp:new Date().toISOString(),ok:tests.every(x=>x.passed),results:tests};
    console.groupCollapsed(`Phase 4.3.1 Revision Management: ${report.ok?'PASS':'FAIL'}`);console.table(tests);console.log(report);console.groupEnd();
    toast(`Phase 4.3.1 Self-Test: ${report.ok?'PASS':'CHECK'}`,report.ok?'success':'warning');
    return report;
  }

  function hookGeneration(){
    const original=window.generateDocumentPackV43;
    if(typeof original!=='function' || original.__phase431Wrapped) return;
    const wrapped=async function(...args){
      const result=await original.apply(this,args);
      if(result?.pack?.packId) window.__phase431CurrentPackId=result.pack.packId;
      syncFromPacks();
      render();
      return result;
    };
    wrapped.__phase431Wrapped=true;
    wrapped.__phase431Original=original;
    window.generateDocumentPackV43=wrapped;
  }

  function init(){
    load();
    window.__phase431CurrentPackId=window.__phase431CurrentPackId||null;
    hookGeneration();
    inject();
    if(!selectedDocumentId){const p=currentPack();const d=p?.documents?.[p.documents.length-1];if(d)selectedDocumentId=d.documentId}
    render();
  }

  window.selectPhase431Document=selectDocument;
  window.restorePhase431Revision=restoreRevision;
  window.syncPhase431Revisions=()=>{syncFromPacks();render();toast('Revision ledger disinkronkan.','success');return ledger};
  window.exportPhase431RevisionManifest=exportManifest;
  window.runPhase431SelfTest=selfTest;
  Object.defineProperty(window,'documentPackRevisionLedgerV431',{get:()=>ledger});

  const boot=()=>setTimeout(init,0);
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})();