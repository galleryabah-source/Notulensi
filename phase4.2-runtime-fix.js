/*
 * Meeting Intelligence Ultimate — PHASE 4.2 Runtime Fix
 *
 * Safe runtime extraction for the Phase 4.2 baseline.
 * The baseline HTML contains the revision code inside a <script src="..."> tag;
 * browsers ignore inline script text when src is present. This file restores the
 * Phase 4.2 runtime without changing the existing meeting/history data model.
 */
(function(){
  'use strict';

  const V42_STORAGE_KEY = 'meeting_ai_document_revisions_v42';
  let documentRevisionStoreV42 = {};

  function safeGetV42(key){
    try { return localStorage.getItem(key); } catch(e) { return null; }
  }
  function safeSetV42(key, value){
    try { localStorage.setItem(key, value); return true; } catch(e) { return false; }
  }
  function toastV42(message, type){
    if(typeof window.showToast === 'function') return window.showToast(message, type || 'info');
    console.log('[Phase 4.2]', message);
  }
  function escapeV42(value){
    if(typeof window.escapeHTML === 'function') return window.escapeHTML(value);
    return String(value ?? '').replace(/[&<>\"']/g, function(m){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'})[m]; });
  }
  function hashTextV42(value){
    let h = 2166136261;
    const text = String(value || '');
    for(let i=0;i<text.length;i++){
      h ^= text.charCodeAt(i);
      h = Math.imul(h,16777619);
    }
    return (h >>> 0).toString(16).padStart(8,'0');
  }
  function loadDocumentRevisionStoreV42(){
    try{
      const raw = safeGetV42(V42_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      documentRevisionStoreV42 = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    }catch(e){
      console.warn('Phase 4.2 revision store load failed:', e);
      documentRevisionStoreV42 = {};
    }
  }
  function saveDocumentRevisionStoreV42(){
    try { return safeSetV42(V42_STORAGE_KEY, JSON.stringify(documentRevisionStoreV42)); }
    catch(e){ console.warn('Phase 4.2 revision store save failed:',e); return false; }
  }
  function getCurrentTemplateMetaV42(){
    const key = window.activeDocumentTemplateV41 || '';
    const store = window.documentTemplatesV41 || {};
    const t = store[key] || {};
    return {id:key || 'builtin-unknown', name:t.name || key || 'Template', version:t.version || '1.0.0'};
  }
  function getCurrentMeetingV42(){
    if(typeof window.getCurrentMeetingForDocuments === 'function'){
      try { return window.getCurrentMeetingForDocuments() || {}; } catch(e) { console.warn(e); }
    }
    return window.currentAnalysisResult || {};
  }
  function getCurrentSourceIdV42(){
    const m = getCurrentMeetingV42();
    return String(m && (m.id || window.currentAnalysisResult?.id) || 'current-meeting');
  }
  function getCurrentDocumentIdV42(){
    const d = window.currentGeneratedDocument;
    if(!d) return '';
    const t = getCurrentTemplateMetaV42();
    return `DOC-${getCurrentSourceIdV42()}-${d.type || 'document'}-${t.id}`;
  }
  function normalizeAnalysisV42(meeting){
    if(typeof window.normalizeAnalysis === 'function'){
      try { return window.normalizeAnalysis(meeting?.analysis) || {}; } catch(e) { console.warn(e); }
    }
    return meeting?.analysis && typeof meeting.analysis === 'object' ? meeting.analysis : {};
  }
  function buildRevisionSnapshotV42(){
    const d = window.currentGeneratedDocument;
    if(!d || !d.content) return null;
    const m = getCurrentMeetingV42();
    const a = normalizeAnalysisV42(m) || {};
    const t = getCurrentTemplateMetaV42();
    const documentId = getCurrentDocumentIdV42();
    if(!documentId) return null;

    const revisions = documentRevisionStoreV42[documentId] || [];
    const last = revisions[revisions.length - 1];
    const contentHash = hashTextV42(d.content);
    if(last && last.contentHash === contentHash && last.template?.version === t.version) return last;

    const revision = {
      revisionId:`${documentId}:r${revisions.length + 1}`,
      documentId,
      revision:revisions.length + 1,
      type:d.type || '',
      label:d.label || '',
      title:d.title || m?.title || 'Meeting',
      content:String(d.content),
      contentHash,
      source:{
        meetingId:String(m?.id || getCurrentSourceIdV42()),
        title:m?.title || '',
        date:m?.date || '',
        time:m?.time || '',
        location:m?.location || '',
        transcriptHash:hashTextV42(m?.transcript || document.getElementById('transcriptInput')?.value || ''),
        analysisHash:hashTextV42(JSON.stringify(a || {})),
        intelligence:{
          summary:Boolean(a?.summary),
          decisions:Array.isArray(a?.decisions) ? a.decisions.length : 0,
          actionItems:Array.isArray(a?.actionItems) ? a.actionItems.length : 0,
          risks:Array.isArray(a?.risks) ? a.risks.length : 0,
          topics:Array.isArray(a?.topics) ? a.topics.length : 0
        }
      },
      template:{id:t.id,name:t.name,version:t.version},
      generation:{
        mode:document.getElementById('documentGenerationMode')?.value || 'deterministic',
        language:document.getElementById('documentLanguage')?.value || 'id'
      },
      createdAt:new Date().toISOString(),
      updatedAt:new Date().toISOString()
    };

    revisions.push(revision);
    documentRevisionStoreV42[documentId] = revisions;
    saveDocumentRevisionStoreV42();
    return revision;
  }
  function renderPhase42Versioning(){
    const id = getCurrentDocumentIdV42();
    const revisions = id ? (documentRevisionStoreV42[id] || []) : [];
    const latest = revisions[revisions.length - 1];
    const set = function(id,val){ const el=document.getElementById(id); if(el) el.textContent=val; };
    set('v42DocumentId', id || '-');
    set('v42RevisionNumber', latest?.revision || 0);
    set('v42TemplateVersion', latest ? `${latest.template.name} · v${latest.template.version}` : '-');
    set('v42GenerationMode', latest ? `${latest.generation.mode} · ${latest.generation.language}` : '-');
    set('v42RevisionCount', `${revisions.length} revisi`);

    const list = document.getElementById('v42RevisionList');
    if(list){
      list.innerHTML = revisions.length ? revisions.slice().reverse().map(function(r){
        return `<div class="bg-slate-900 border border-slate-800 rounded-lg p-3"><div class="flex justify-between gap-2"><div><b class="text-xs text-slate-200">v${r.revision} · ${escapeV42(r.label)}</b><div class="text-[11px] text-slate-500 mt-1">${escapeV42(new Date(r.createdAt).toLocaleString('id-ID'))} · hash ${escapeV42(r.contentHash)}</div></div><button onclick="restoreDocumentRevisionV42(${JSON.stringify(r.revisionId)})" class="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[11px]">Muat</button></div><div class="text-[11px] text-slate-400 mt-2">Template v${escapeV42(r.template.version)} · ${escapeV42(r.generation.mode)} · sumber ${escapeV42(r.source.meetingId)}</div></div>`;
      }).join('') : '<p class="text-xs text-slate-500 italic">Belum ada revision snapshot.</p>';
    }

    const trace = document.getElementById('v42Traceability');
    if(trace){
      if(!latest){ trace.innerHTML='<p>Belum ada dokumen aktif.</p>'; }
      else {
        trace.innerHTML = [
          ['Document ID',latest.documentId],['Revision ID',latest.revisionId],['Meeting Source',latest.source.meetingId],['Transcript Hash',latest.source.transcriptHash],['Analysis Hash',latest.source.analysisHash],['Template',`${latest.template.name} v${latest.template.version}`],['Mode',latest.generation.mode],['Generated',new Date(latest.createdAt).toLocaleString('id-ID')]
        ].map(function(x){ return `<div class="flex justify-between gap-3 border-b border-slate-800 pb-1"><span>${escapeV42(x[0])}</span><span class="text-slate-300 text-right break-all">${escapeV42(x[1])}</span></div>`; }).join('');
      }
    }
  }
  function saveCurrentDocumentRevisionV42(){
    if(!window.currentGeneratedDocument) return toastV42('Buat dokumen terlebih dahulu sebelum menyimpan revisi.','warning');
    const id = getCurrentDocumentIdV42();
    const before = (documentRevisionStoreV42[id] || []).length;
    const r = buildRevisionSnapshotV42();
    renderPhase42Versioning();
    if(r && (documentRevisionStoreV42[r.documentId] || []).length > before) toastV42(`Revisi v${r.revision} berhasil disimpan.`,'success');
    else toastV42('Tidak ada perubahan baru; snapshot terakhir tetap digunakan.','info');
    return r;
  }
  function restoreDocumentRevisionV42(revisionId){
    let found = null;
    Object.values(documentRevisionStoreV42).some(function(arr){
      const x=(arr || []).find(function(r){ return r.revisionId === revisionId; });
      if(x){ found=x; return true; }
      return false;
    });
    if(!found) return toastV42('Revisi tidak ditemukan.','error');
    window.currentGeneratedDocument={type:found.type,label:found.label,content:found.content,title:found.title,revisionId:found.revisionId,revision:found.revision};
    const out=document.getElementById('generatedDocumentContent'); if(out) out.textContent=found.content;
    const label=document.getElementById('generatedDocLabel'); if(label) label.textContent=`${found.label} · v${found.revision}`;
    const meta=document.getElementById('documentTraceMeta'); if(meta) meta.textContent=`Sumber: Meeting #${found.source.meetingId} · ${found.template.name} v${found.template.version} · Revisi ${found.revision}`;
    renderPhase42Versioning();
    toastV42(`Revisi v${found.revision} dimuat tanpa mengubah history sumber.`,'success');
    return found;
  }
  function exportCurrentRevisionManifestV42(){
    const id=getCurrentDocumentIdV42();
    if(!id) return toastV42('Belum ada dokumen aktif.','warning');
    const revisions=documentRevisionStoreV42[id] || [];
    if(!revisions.length) return toastV42('Belum ada revision snapshot. Klik Simpan Revisi.','warning');
    const payload={schemaVersion:'4.2',exportedAt:new Date().toISOString(),documentId:id,revisions};
    if(typeof window.downloadFile==='function') window.downloadFile(JSON.stringify(payload,null,2),`Document_${String(window.currentGeneratedDocument?.title||'Meeting').replace(/[^a-zA-Z0-9_-]+/g,'_')}_RevisionManifest.json`,'application/json');
  }
  function runPhase42SelfTest(){
    const r=[]; const c=(name,passed,detail)=>r.push({name,passed:Boolean(passed),detail:detail||''});
    c('Revision store object',documentRevisionStoreV42 && typeof documentRevisionStoreV42==='object' && !Array.isArray(documentRevisionStoreV42));
    c('Hash deterministic',hashTextV42('abc')===hashTextV42('abc'));
    c('Hash differentiates',hashTextV42('abc')!==hashTextV42('abd'));
    c('Revision schema helper',typeof buildRevisionSnapshotV42==='function' && typeof restoreDocumentRevisionV42==='function');
    if(window.currentGeneratedDocument?.content){ const x=buildRevisionSnapshotV42(); c('Current document snapshot',Boolean(x&&x.documentId&&x.revisionId&&x.source&&x.template&&x.generation)); }
    else c('Current document snapshot',true,'Tidak ada dokumen aktif; structural test only.');
    const history = window.meetingHistory;
    c('Legacy history reference available',typeof history !== 'undefined');
    const report={phase:'4.2-runtime-fix',timestamp:new Date().toISOString(),ok:r.every(x=>x.passed),results:r,storageKey:V42_STORAGE_KEY};
    console.groupCollapsed(`Phase 4.2 Runtime: ${report.ok?'PASS':'CHECK'}`); console.table(r); console.log(report); console.groupEnd();
    return report;
  }

  function expose(){
    window.documentRevisionStoreV42 = documentRevisionStoreV42;
    window.hashTextV42 = hashTextV42;
    window.getCurrentTemplateMetaV42 = getCurrentTemplateMetaV42;
    window.getCurrentSourceIdV42 = getCurrentSourceIdV42;
    window.getCurrentDocumentIdV42 = getCurrentDocumentIdV42;
    window.buildRevisionSnapshotV42 = buildRevisionSnapshotV42;
    window.renderPhase42Versioning = renderPhase42Versioning;
    window.saveCurrentDocumentRevisionV42 = saveCurrentDocumentRevisionV42;
    window.restoreDocumentRevisionV42 = restoreDocumentRevisionV42;
    window.exportCurrentRevisionManifestV42 = exportCurrentRevisionManifestV42;
    window.runPhase42SelfTest = runPhase42SelfTest;
    window.loadDocumentRevisionStoreV42 = loadDocumentRevisionStoreV42;
    window.saveDocumentRevisionStoreV42 = saveDocumentRevisionStoreV42;
  }

  function init(){
    loadDocumentRevisionStoreV42();
    expose();
    try { renderPhase42Versioning(); } catch(e) { console.warn('Phase 4.2 runtime render failed:',e); }
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
