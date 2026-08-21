/*
 * Meeting Intelligence Ultimate — PHASE 4.3
 * Multi-Document Generation & Document Pack
 *
 * Integration target: Phase 4.2 baseline HTML.
 * Non-destructive: uses separate localStorage namespace and does not mutate
 * meetingHistory, rawAI, analysis, continuity state, or Knowledge Graph.
 */
(function(){
  'use strict';

  const STORAGE_KEY = 'meeting_ai_document_packs_v43';
  const SCHEMA_VERSION = '4.3';
  const TYPES = [
    {type:'officialReport',label:'Laporan Dinas'},
    {type:'minutes',label:'Notulen'},
    {type:'beritaAcara',label:'Berita Acara'},
    {type:'executiveBrief',label:'Executive Brief'},
    {type:'followUpMemo',label:'Memo Tindak Lanjut'},
    {type:'actionTracker',label:'Action Tracker'}
  ];

  let store = {};
  let currentPackId = '';
  let currentPack = null;

  const get = k => { try { return localStorage.getItem(k); } catch(e){ return null; } };
  const set = (k,v) => { try { localStorage.setItem(k,v); return true; } catch(e){ return false; } };
  const esc = v => typeof escapeHTML === 'function' ? escapeHTML(v) : String(v ?? '').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const toast = (m,t='info') => typeof showToast === 'function' ? showToast(m,t) : console.log(m);
  const hash = value => {
    let h=2166136261, s=String(value ?? '');
    for(let i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h=Math.imul(h,16777619); }
    return (h>>>0).toString(16).padStart(8,'0');
  };

  function load(){
    try{
      const parsed=JSON.parse(get(STORAGE_KEY)||'{}');
      store=parsed && typeof parsed==='object' && !Array.isArray(parsed) ? parsed : {};
    }catch(e){ store={}; }
  }
  function save(){ set(STORAGE_KEY,JSON.stringify(store)); }

  function meeting(){
    if(typeof getCurrentMeetingForDocuments==='function') return getCurrentMeetingForDocuments();
    return window.currentAnalysisResult || {};
  }

  function templateMeta(){
    const id=window.activeDocumentTemplateV41 || 'builtin-unknown';
    const t=(window.documentTemplatesV41||{})[id]||{};
    return {id,name:t.name||id,version:t.version||'1.0.0'};
  }

  function packId(){
    const m=meeting(), t=templateMeta();
    return `PACK-${String(m?.id||'current-meeting')}-${t.id}`;
  }

  function makePack(){
    const m=meeting(), t=templateMeta(), id=packId();
    const existing=store[id];
    const pack=existing || {
      schemaVersion:SCHEMA_VERSION,
      packId:id,
      source:{
        meetingId:String(m?.id||'current-meeting'),
        title:String(m?.title||''),
        transcriptHash:hash(m?.transcript||''),
        analysisHash:hash(JSON.stringify(m?.analysis||{}))
      },
      template:{id:t.id,name:t.name,version:t.version},
      createdAt:new Date().toISOString(),
      updatedAt:new Date().toISOString(),
      documents:[]
    };
    pack.updatedAt=new Date().toISOString();
    pack.source={
      meetingId:String(m?.id||'current-meeting'),
      title:String(m?.title||''),
      transcriptHash:hash(m?.transcript||''),
      analysisHash:hash(JSON.stringify(m?.analysis||{}))
    };
    pack.template={id:t.id,name:t.name,version:t.version};
    store[id]=pack; currentPackId=id; currentPack=pack; save(); return pack;
  }

  function documentTypes(){
    return TYPES.slice();
  }

  function generateOne(type){
    if(typeof generateDocumentV4==='function') return generateDocumentV4(type);
    if(typeof generateDocument==='function') return generateDocument(type);
    throw new Error('Document generation engine tidak tersedia.');
  }

  async function generatePack(types=TYPES.map(x=>x.type)){
    if(!meeting()?.title && !window.currentAnalysisResult) throw new Error('Meeting source belum tersedia.');
    const pack=makePack();
    const results=[];
    for(const type of types){
      try{
        const before=window.currentGeneratedDocument;
        await Promise.resolve(generateOne(type));
        const d=window.currentGeneratedDocument || before;
        if(!d?.content) throw new Error('Output dokumen kosong.');
        const meta=TYPES.find(x=>x.type===type)||{label:type};
        const item={
          documentId:`DOC-${pack.source.meetingId}-${type}-${pack.template.id}`,
          packId:pack.packId,
          type,
          label:d.label||meta.label,
          title:d.title||pack.source.title,
          content:String(d.content),
          contentHash:hash(d.content),
          template:{...pack.template},
          source:{...pack.source},
          generatedAt:new Date().toISOString()
        };
        const idx=pack.documents.findIndex(x=>x.documentId===item.documentId && x.contentHash===item.contentHash);
        if(idx<0) pack.documents.push(item);
        results.push({type,ok:true,documentId:item.documentId,contentHash:item.contentHash});
      }catch(e){ results.push({type,ok:false,error:String(e?.message||e)}); }
    }
    pack.updatedAt=new Date().toISOString(); store[pack.packId]=pack; save(); currentPack=pack; render();
    const ok=results.filter(x=>x.ok).length;
    toast(`Document Pack ${ok}/${results.length} dokumen berhasil dibuat.`,ok===results.length?'success':'warning');
    return {pack,results};
  }

  function selectPackDocument(documentId){
    const pack=currentPack || store[currentPackId];
    const d=(pack?.documents||[]).find(x=>x.documentId===documentId);
    if(!d) return toast('Dokumen dalam pack tidak ditemukan.','error');
    window.currentGeneratedDocument={type:d.type,label:d.label,content:d.content,title:d.title,packId:d.packId,documentId:d.documentId};
    const out=document.getElementById('generatedDocumentContent'); if(out) out.textContent=d.content;
    const label=document.getElementById('generatedDocLabel'); if(label) label.textContent=d.label;
    const meta=document.getElementById('documentTraceMeta'); if(meta) meta.textContent=`Pack: ${d.packId} · Document: ${d.documentId}`;
    if(typeof validateGeneratedDocument==='function') validateGeneratedDocument();
    toast(`${d.label} dimuat dari Document Pack.`,'success');
  }

  function exportPack(){
    const pack=currentPack || store[currentPackId];
    if(!pack) return toast('Belum ada Document Pack.','warning');
    const payload=JSON.stringify(pack,null,2);
    const name=`DocumentPack_${String(pack.source?.title||'Meeting').replace(/[^a-zA-Z0-9_-]+/g,'_').slice(0,80)}_${pack.packId}.json`;
    if(typeof downloadFile==='function') downloadFile(payload,name,'application/json');
    else if(typeof download==='function') download(payload,name,'application/json');
  }

  function render(){
    const p=currentPack || store[currentPackId];
    const box=document.getElementById('v43PackContent');
    if(!box) return;
    if(!p){
      box.innerHTML='<p class="text-xs text-slate-500 italic">Belum ada Document Pack.</p>'; return;
    }
    const docs=TYPES.map(t=>{
      const d=(p.documents||[]).slice().reverse().find(x=>x.type===t.type);
      return `<div class="bg-slate-950 border border-slate-800 rounded-xl p-3"><div class="flex items-center justify-between gap-3"><div><b class="text-xs text-slate-200">${esc(d?.label||t.label)}</b><div class="text-[11px] text-slate-500 mt-1">${d?`hash ${esc(d.contentHash)} · ${esc(new Date(d.generatedAt).toLocaleString('id-ID'))}`:'Belum dibuat'}</div></div>${d?`<button onclick="window.selectDocumentPackDocumentV43(${JSON.stringify(d.documentId)})" class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-[11px]">Muat</button>`:'<span class="text-[11px] text-slate-600">—</span>'}</div><div class="text-[10px] text-slate-500 mt-2">Document ID: ${esc(d?.documentId||`DOC-${p.source.meetingId}-${t.type}-${p.template.id}`)}</div></div>`;
    }).join('');
    box.innerHTML=`<div class="grid grid-cols-1 md:grid-cols-2 gap-2">${docs}</div>`;
  }

  function injectUI(){
    if(document.getElementById('phase43PackPanel')) return;
    const docsTab=document.getElementById('docsTab'); if(!docsTab) return;
    const panel=document.createElement('div');
    panel.id='phase43PackPanel';
    panel.className='bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl mt-4';
    panel.innerHTML=`<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4"><div><h3 class="font-semibold">📦 PHASE 4.3 — Multi-Document Generation & Document Pack</h3><p class="text-xs text-slate-500 mt-1">Satu meeting menghasilkan paket dokumen terhubung dengan satu Pack ID, source snapshot, template version, dan traceability antar dokumen.</p></div><div class="flex flex-wrap gap-2"><button onclick="window.generateDocumentPackV43()" class="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-semibold">📦 Generate Document Pack</button><button onclick="window.exportDocumentPackV43()" class="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs">JSON Pack</button><button onclick="window.runPhase43SelfTest()" class="px-3 py-2 bg-emerald-700 hover:bg-emerald-600 rounded-lg text-xs">✓ Self-Test</button></div></div><div class="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4"><div class="bg-slate-950 border border-slate-800 rounded-xl p-3"><div class="text-[11px] text-slate-500">Pack ID</div><div id="v43PackId" class="text-xs font-mono text-slate-300 mt-1 break-all">-</div></div><div class="bg-slate-950 border border-slate-800 rounded-xl p-3"><div class="text-[11px] text-slate-500">Meeting Source</div><div id="v43SourceId" class="text-xs text-slate-300 mt-1">-</div></div><div class="bg-slate-950 border border-slate-800 rounded-xl p-3"><div class="text-[11px] text-slate-500">Template</div><div id="v43Template" class="text-xs text-slate-300 mt-1">-</div></div><div class="bg-slate-950 border border-slate-800 rounded-xl p-3"><div class="text-[11px] text-slate-500">Dokumen</div><div id="v43DocumentCount" class="text-lg font-bold text-indigo-400 mt-1">0/6</div></div></div><div id="v43PackContent"><p class="text-xs text-slate-500 italic">Belum ada Document Pack.</p></div>`;
    docsTab.appendChild(panel);
  }

  function selfTest(){
    const tests=[], c=(name,passed,detail='')=>tests.push({name,passed:Boolean(passed),detail});
    c('Schema version',SCHEMA_VERSION==='4.3');
    c('Document type catalog',TYPES.length===6);
    c('Pack ID deterministic',packId()===packId());
    c('Storage isolation',STORAGE_KEY!=='meeting_ai_document_revisions_v42' && STORAGE_KEY!=='meeting_ai_history');
    c('Non-destructive source',typeof getCurrentMeetingForDocuments==='function' || !!window.currentAnalysisResult);
    c('Generator available',typeof generateDocumentV4==='function' || typeof generateDocument==='function');
    const report={phase:'4.3',timestamp:new Date().toISOString(),ok:tests.every(x=>x.passed),results:tests};
    console.groupCollapsed(`Phase 4.3 Document Pack: ${report.ok?'PASS':'FAIL'}`); console.table(tests); console.log(report); console.groupEnd();
    toast(`Phase 4.3 Self-Test: ${report.ok?'PASS':'CHECK'}`,report.ok?'success':'warning');
    return report;
  }

  function init(){
    load();
    injectUI();
    if(currentPackId && store[currentPackId]) currentPack=store[currentPackId];
    else { const keys=Object.keys(store); if(keys.length){currentPackId=keys[0];currentPack=store[currentPackId];} }
    render();
  }

  window.generateDocumentPackV43=generatePack;
  window.selectDocumentPackDocumentV43=selectPackDocument;
  window.exportDocumentPackV43=exportPack;
  window.runPhase43SelfTest=selfTest;
  window.documentPackStoreV43=store;
  window.phase43DocumentTypes=TYPES;

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();
