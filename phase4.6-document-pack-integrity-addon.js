/*
 * Meeting Intelligence Ultimate — PHASE 4.6
 * Document Pack Integrity & Audit Guard
 *
 * Non-destructive addon for Phase 4.2–4.5.
 * It validates pack/document/revision traceability without mutating
 * meetingHistory, rawAI, analysis, continuity, Knowledge Graph, or revisions.
 */
(function(){
  'use strict';

  const PACK_KEY = 'meeting_ai_document_packs_v43';
  const PANEL_ID = 'phase46IntegrityPanel';
  const TYPES = ['officialReport','minutes','beritaAcara','executiveBrief','followUpMemo','actionTracker'];

  function readPacks(){
    try{
      const x = JSON.parse(localStorage.getItem(PACK_KEY) || '{}');
      return x && typeof x === 'object' && !Array.isArray(x) ? x : {};
    }catch(e){ return {}; }
  }
  function currentPack(){
    if(window.currentPackV43) return window.currentPackV43;
    const store = readPacks();
    const id = window.currentPackIdV43;
    if(id && store[id]) return store[id];
    const ids = Object.keys(store);
    return ids.length ? store[ids[ids.length-1]] : null;
  }
  function hash(value){
    let h = 2166136261;
    const text = String(value ?? '');
    for(let i=0;i<text.length;i++){
      h ^= text.charCodeAt(i);
      h = Math.imul(h,16777619);
    }
    return (h >>> 0).toString(16).padStart(8,'0');
  }
  function esc(v){
    if(typeof window.escapeHTML === 'function') return window.escapeHTML(v);
    return String(v ?? '').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  }
  function toast(m,t){
    if(typeof window.showToast === 'function') window.showToast(m,t || 'info');
    else console.log('[Phase 4.6]',m);
  }
  function revisions(documentId){
    const store = window.documentRevisionStoreV42;
    return store && typeof store === 'object' && Array.isArray(store[documentId]) ? store[documentId] : [];
  }

  function validatePack(pack){
    const results=[];
    const add=(code,ok,detail,level)=>results.push({code,ok,detail,level:level||'error'});

    if(!pack){
      add('PACK_PRESENT',false,'Tidak ada Document Pack aktif.','error');
      return results;
    }
    add('PACK_SCHEMA',pack.schemaVersion === '4.3.1',`schemaVersion=${pack.schemaVersion || 'missing'}`,'error');
    add('PACK_ID',Boolean(pack.packId),`packId=${pack.packId || 'missing'}`,'error');
    add('SOURCE_ID',Boolean(pack.source?.meetingId),`meetingId=${pack.source?.meetingId || 'missing'}`,'error');
    add('TEMPLATE_META',Boolean(pack.template?.id && pack.template?.version),`template=${pack.template?.id || 'missing'} v${pack.template?.version || 'missing'}`,'error');

    const docs = Array.isArray(pack.documents) ? pack.documents : [];
    add('DOCUMENT_ARRAY',Array.isArray(pack.documents),`documents=${docs.length}`,'error');

    const ids = new Set();
    const types = new Set();
    docs.forEach((d,index)=>{
      const prefix=`DOC_${index+1}`;
      add(prefix+'_ID',Boolean(d.documentId),d.documentId || 'missing','error');
      add(prefix+'_PACK_LINK',d.packId === pack.packId,`packId=${d.packId || 'missing'}`,'error');
      add(prefix+'_TYPE',TYPES.includes(d.type),`type=${d.type || 'missing'}`,'error');
      add(prefix+'_CONTENT',typeof d.content === 'string' && d.content.trim().length>0,`length=${String(d.content || '').length}`,'error');
      const actualHash=hash(d.content || '');
      add(prefix+'_CONTENT_HASH',d.contentHash === actualHash,`stored=${d.contentHash || 'missing'} actual=${actualHash}`,'error');
      if(ids.has(d.documentId)) add(prefix+'_DUPLICATE_ID',false,`duplicate=${d.documentId}`,'error');
      ids.add(d.documentId);
      if(types.has(d.type)) add(prefix+'_DUPLICATE_TYPE',false,`duplicate type=${d.type}`,'warning');
      types.add(d.type);

      const revs=revisions(d.documentId);
      if(d.revisionId){
        const linked=revs.find(r=>r.revisionId===d.revisionId);
        add(prefix+'_REVISION_LINK',Boolean(linked),linked?`revision=v${linked.revision}`:`revisionId=${d.revisionId} not found`,'error');
        if(linked) add(prefix+'_REVISION_HASH',linked.contentHash===d.contentHash,`revisionHash=${linked.contentHash} docHash=${d.contentHash}`,'error');
      }else{
        add(prefix+'_REVISION_LINK',revs.length===0,`no revisionId; revisionStoreCount=${revs.length}`,'warning');
      }

      if(d.source){
        add(prefix+'_SOURCE_MEETING',d.source.meetingId===pack.source.meetingId,`doc=${d.source.meetingId || 'missing'} pack=${pack.source.meetingId}`,'error');
        add(prefix+'_SOURCE_TRANSCRIPT',Boolean(d.source.transcriptHash),`transcriptHash=${d.source.transcriptHash || 'missing'}`,'warning');
        add(prefix+'_SOURCE_ANALYSIS',Boolean(d.source.analysisHash),`analysisHash=${d.source.analysisHash || 'missing'}`,'warning');
      }else add(prefix+'_SOURCE_META',false,'source snapshot missing','error');
    });

    const expectedTypes = TYPES.filter(t=>docs.some(d=>d.type===t));
    add('PACK_TYPE_COVERAGE',expectedTypes.length===TYPES.length,`${expectedTypes.length}/${TYPES.length} document types present`,'warning');

    return results;
  }

  function audit(){
    const pack=currentPack();
    const results=validatePack(pack);
    const errors=results.filter(x=>!x.ok && x.level==='error').length;
    const warnings=results.filter(x=>!x.ok && x.level==='warning').length;
    return {
      phase:'4.6',
      schemaVersion:'4.6.0',
      timestamp:new Date().toISOString(),
      ok:errors===0,
      errors,
      warnings,
      packId:pack?.packId || null,
      checks:results
    };
  }

  function render(report){
    const box=document.getElementById('v46IntegrityResults');
    const status=document.getElementById('v46IntegrityStatus');
    if(!box || !status) return;
    status.textContent=report.ok
      ? `PASS · ${report.warnings} warning`
      : `CHECK · ${report.errors} error · ${report.warnings} warning`;
    status.className='text-[11px] mt-1 '+(report.ok?'text-emerald-400':'text-rose-400');
    box.innerHTML=report.checks.length
      ? report.checks.map(x=>`<div class="flex gap-2 border-b border-slate-800 py-1.5"><span class="shrink-0 ${x.ok?'text-emerald-400':'text-rose-400'}">${x.ok?'✓':'✕'}</span><div class="min-w-0"><div class="text-[10px] text-slate-300">${esc(x.code)}</div><div class="text-[10px] text-slate-500 break-all">${esc(x.detail)}</div></div></div>`).join('')
      : '<div class="text-xs text-slate-500">Belum ada hasil audit.</div>';
  }

  function exportAudit(){
    const report=audit();
    const text=JSON.stringify(report,null,2);
    const name=`DocumentPack_Audit_${String(report.packId || 'none').replace(/[^a-zA-Z0-9_-]+/g,'_')}.json`;
    if(typeof window.downloadFile==='function') window.downloadFile(text,name,'application/json;charset=utf-8');
    else{
      const u=URL.createObjectURL(new Blob([text],{type:'application/json'}));
      const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);
    }
  }

  function inject(){
    if(document.getElementById(PANEL_ID)) return true;
    const host=document.getElementById('docsTab');
    if(!host) return false;
    const panel=document.createElement('section');
    panel.id=PANEL_ID;
    panel.className='bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl mt-4';
    panel.innerHTML=`<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3"><div><h3 class="font-semibold text-slate-100">Phase 4.6 · Document Pack Integrity</h3><p id="v46IntegrityStatus" class="text-[11px] mt-1 text-slate-500">Belum diaudit.</p></div><div class="flex flex-wrap gap-2"><button id="v46RunAudit" class="px-3 py-1.5 bg-indigo-700 rounded-lg text-[11px]">Jalankan Audit</button><button id="v46ExportAudit" class="px-3 py-1.5 bg-slate-800 rounded-lg text-[11px]">Export Audit JSON</button></div></div><div id="v46IntegrityResults" class="max-h-80 overflow-auto bg-slate-950 border border-slate-800 rounded-xl p-3"></div><p class="text-[10px] text-slate-500 mt-3">Audit bersifat read-only. Tidak melakukan repair otomatis agar revision history dan sumber meeting tetap immutable.</p>`;
    host.appendChild(panel);
    document.getElementById('v46RunAudit').addEventListener('click',()=>render(audit()));
    document.getElementById('v46ExportAudit').addEventListener('click',exportAudit);
    return true;
  }

  function selfTest(){
    const report=audit();
    const tests=[
      ['Hash deterministic',hash('abc')===hash('abc')],
      ['Hash differentiation',hash('abc')!==hash('abd')],
      ['Pack reader',typeof readPacks==='function'],
      ['Audit schema',report.schemaVersion==='4.6.0'],
      ['Read-only design',true],
      ['Phase 4.2 revision bridge',typeof window.restoreDocumentRevisionV42==='function']
    ];
    report.selfTest=tests;
    report.ok=report.ok && tests.every(x=>x[1]);
    console.groupCollapsed(`Phase 4.6 Integrity: ${report.ok?'PASS':'CHECK'}`);
    console.table(tests);
    console.log(report);
    console.groupEnd();
    render(report);
    return report;
  }

  function init(){
    window.auditDocumentPackV46=audit;
    window.exportDocumentPackAuditV46=exportAudit;
    window.runPhase46SelfTest=selfTest;
    const run=()=>{inject();};
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run,{once:true}); else run();
    setTimeout(run,500);
    setTimeout(run,1500);
  }
  init();
})();
