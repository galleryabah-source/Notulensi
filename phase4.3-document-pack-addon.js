/*
 * Meeting Intelligence Ultimate — PHASE 4.3.1
 * Multi-Document Generation & Document Pack
 *
 * Non-destructive enhancement for the Phase 4.2 baseline.
 * - Does not mutate meetingHistory/rawAI/analysis/continuity/Knowledge Graph.
 * - Reuses the existing Phase 4.1/4.2 document generator and revision store.
 * - Stores only pack metadata and document snapshots in its own namespace.
 */
(function(){
  'use strict';

  const STORAGE_KEY = 'meeting_ai_document_packs_v43';
  const SCHEMA_VERSION = '4.3.1';
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

  const get = key => {
    try { return localStorage.getItem(key); } catch(e) { return null; }
  };
  const set = (key, value) => {
    try { localStorage.setItem(key, value); return true; } catch(e) { return false; }
  };
  const esc = value => {
    if (typeof window.escapeHTML === 'function') return window.escapeHTML(value);
    return String(value ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  };
  const toast = (message, type='info') => {
    if (typeof window.showToast === 'function') window.showToast(message, type);
    else console.log(`[Phase 4.3] ${message}`);
  };
  const hash = value => {
    let h = 2166136261;
    const text = String(value ?? '');
    for (let i=0; i<text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(16).padStart(8, '0');
  };
  const slug = value => String(value ?? 'Meeting')
    .trim().replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80) || 'Meeting';

  function load(){
    try {
      const parsed = JSON.parse(get(STORAGE_KEY) || '{}');
      store = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch(e) {
      console.warn('Phase 4.3 pack store load failed:', e);
      store = {};
    }
  }

  function save(){
    const ok = set(STORAGE_KEY, JSON.stringify(store));
    if (!ok) console.warn('Phase 4.3 pack store save failed.');
    return ok;
  }

  function getMeeting(){
    if (typeof window.getCurrentMeetingForDocuments === 'function') {
      try { return window.getCurrentMeetingForDocuments() || {}; } catch(e) { console.warn(e); }
    }
    return window.currentAnalysisResult || {};
  }

  function getTemplateMeta(){
    const id = window.activeDocumentTemplateV41 || 'builtin-unknown';
    const templates = window.documentTemplatesV41 || {};
    const template = templates[id] || {};
    return {
      id,
      name: template.name || id,
      version: template.version || '1.0.0'
    };
  }

  function sourceSnapshot(){
    const meeting = getMeeting();
    const analysis = meeting?.analysis || {};
    return {
      meetingId: String(meeting?.id || 'current-meeting'),
      title: String(meeting?.title || document.getElementById('meetingTitle')?.value || 'Meeting'),
      date: String(meeting?.date || document.getElementById('meetingDate')?.value || ''),
      time: String(meeting?.time || document.getElementById('meetingTime')?.value || ''),
      location: String(meeting?.location || document.getElementById('meetingLocation')?.value || ''),
      transcriptHash: hash(meeting?.transcript || document.getElementById('transcriptInput')?.value || ''),
      analysisHash: hash(JSON.stringify(analysis || {})),
      intelligence: {
        summary: Boolean(analysis?.summary),
        decisions: Array.isArray(analysis?.decisions) ? analysis.decisions.length : 0,
        actionItems: Array.isArray(analysis?.actionItems) ? analysis.actionItems.length : 0,
        risks: Array.isArray(analysis?.risks) ? analysis.risks.length : 0,
        topics: Array.isArray(analysis?.topics) ? analysis.topics.length : 0
      }
    };
  }

  function packIdFor(source, template){
    return `PACK-${source.meetingId}-${template.id}`;
  }

  function documentIdFor(source, template, type){
    return `DOC-${source.meetingId}-${type}-${template.id}`;
  }

  function getGenerator(){
    const names = ['generateDocumentV4','generateDocumentV41','generateDocument'];
    for (const name of names) {
      if (typeof window[name] === 'function') return window[name];
    }
    return null;
  }

  function normalizeGeneratedDocument(result){
    const globalDoc = window.currentGeneratedDocument;
    const candidate = (result && typeof result === 'object' && result.content) ? result : globalDoc;
    if (candidate && candidate.content) return candidate;

    const contentEl = document.getElementById('generatedDocumentContent');
    const content = contentEl?.textContent || contentEl?.value || '';
    if (!content.trim()) return null;

    return {
      type: window.currentGeneratedDocument?.type || 'document',
      label: window.currentGeneratedDocument?.label || 'Dokumen',
      title: window.currentGeneratedDocument?.title || sourceSnapshot().title,
      content
    };
  }

  function findRevisionForDocument(documentId, contentHash){
    const revisions = window.documentRevisionStoreV42;
    if (!revisions || typeof revisions !== 'object') return null;
    const list = revisions[documentId] || [];
    return list.slice().reverse().find(r => !contentHash || r.contentHash === contentHash) || list[list.length - 1] || null;
  }

  function bridgeRevisionSnapshot(documentId, content){
    try {
      if (typeof window.buildRevisionSnapshotV42 === 'function') {
        window.buildRevisionSnapshotV42();
      } else if (typeof window.saveCurrentDocumentRevisionV42 === 'function') {
        window.saveCurrentDocumentRevisionV42();
      }
    } catch(e) {
      console.warn('Phase 4.3 revision bridge failed:', e);
    }
    return findRevisionForDocument(documentId, hash(content));
  }

  function makePack(){
    const source = sourceSnapshot();
    const template = getTemplateMeta();
    const id = packIdFor(source, template);
    let pack = store[id];

    if (!pack) {
      pack = {
        schemaVersion: SCHEMA_VERSION,
        packId: id,
        source,
        template,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        documents: []
      };
    } else {
      pack.schemaVersion = SCHEMA_VERSION;
      pack.source = source;
      pack.template = template;
      pack.updatedAt = new Date().toISOString();
      if (!Array.isArray(pack.documents)) pack.documents = [];
    }

    store[id] = pack;
    currentPackId = id;
    currentPack = pack;
    save();
    return pack;
  }

  async function generateOne(type){
    const generator = getGenerator();
    if (!generator) throw new Error('Document generation engine tidak tersedia.');

    const before = window.currentGeneratedDocument;
    const result = await Promise.resolve(generator(type));
    const doc = normalizeGeneratedDocument(result);
    if (!doc) throw new Error(`Output ${type} kosong.`);

    if (!doc.type || doc.type === 'document') doc.type = type;
    if (!doc.label) doc.label = TYPES.find(x => x.type === type)?.label || type;
    if (!doc.title) doc.title = sourceSnapshot().title;

    if (result && typeof result === 'object' && result.content && !window.currentGeneratedDocument) {
      window.currentGeneratedDocument = doc;
    }
    return {doc, before};
  }

  async function generatePack(types = TYPES.map(x => x.type)){
    const source = sourceSnapshot();
    if (!source.meetingId || source.meetingId === 'current-meeting') {
      if (!source.title.trim()) throw new Error('Meeting source belum tersedia.');
    }

    const pack = makePack();
    const results = [];

    for (const type of types) {
      try {
        const {doc} = await generateOne(type);
        const template = getTemplateMeta();
        const sourceNow = sourceSnapshot();
        const content = String(doc.content);
        const contentHash = hash(content);
        const documentId = documentIdFor(sourceNow, template, type);
        const revision = bridgeRevisionSnapshot(documentId, content);
        const item = {
          documentId,
          packId: pack.packId,
          type,
          label: String(doc.label || TYPES.find(x => x.type === type)?.label || type),
          title: String(doc.title || sourceNow.title),
          content,
          contentHash,
          revisionId: revision?.revisionId || null,
          revisionNumber: revision?.revision || null,
          template: {...template},
          source: {...sourceNow},
          generatedAt: new Date().toISOString()
        };

        const duplicate = pack.documents.some(x => x.documentId === item.documentId && x.contentHash === item.contentHash);
        if (!duplicate) pack.documents.push(item);

        results.push({
          type,
          ok: true,
          documentId,
          contentHash,
          revisionId: item.revisionId,
          revisionNumber: item.revisionNumber,
          duplicate
        });
      } catch(e) {
        results.push({type, ok:false, error:String(e?.message || e)});
      }
    }

    pack.updatedAt = new Date().toISOString();
    store[pack.packId] = pack;
    currentPack = pack;
    currentPackId = pack.packId;
    save();
    render();

    const okCount = results.filter(x => x.ok).length;
    const allOk = okCount === results.length;
    toast(`Document Pack ${okCount}/${results.length} dokumen berhasil dibuat${results.some(x=>x.duplicate) ? ' · konten identik tidak diduplikasi' : ''}.`, allOk ? 'success' : 'warning');
    return {pack, results};
  }

  function selectPackDocument(documentId){
    const pack = currentPack || store[currentPackId];
    const doc = (pack?.documents || []).slice().reverse().find(x => x.documentId === documentId);
    if (!doc) return toast('Dokumen dalam pack tidak ditemukan.', 'error');

    window.currentGeneratedDocument = {
      type: doc.type,
      label: doc.label,
      content: doc.content,
      title: doc.title,
      packId: doc.packId,
      documentId: doc.documentId,
      revisionId: doc.revisionId,
      revision: doc.revisionNumber
    };

    const out = document.getElementById('generatedDocumentContent');
    if (out) out.textContent = doc.content;
    const label = document.getElementById('generatedDocLabel');
    if (label) label.textContent = `${doc.label}${doc.revisionNumber ? ` · v${doc.revisionNumber}` : ''}`;
    const meta = document.getElementById('documentTraceMeta');
    if (meta) meta.textContent = `Pack: ${doc.packId} · Document: ${doc.documentId}${doc.revisionId ? ` · ${doc.revisionId}` : ''}`;

    if (typeof window.renderPhase42Versioning === 'function') {
      try { window.renderPhase42Versioning(); } catch(e) { console.warn(e); }
    }
    toast(`${doc.label} dimuat dari Document Pack.`, 'success');
  }

  function exportPack(){
    const pack = currentPack || store[currentPackId];
    if (!pack) return toast('Belum ada Document Pack.', 'warning');
    const payload = JSON.stringify(pack, null, 2);
    const filename = `DocumentPack_${slug(pack.source?.title)}_${pack.packId}.json`;
    if (typeof window.downloadFile === 'function') window.downloadFile(payload, filename, 'application/json');
    else if (typeof window.download === 'function') window.download(payload, filename, 'application/json');
    else {
      const blob = new Blob([payload], {type:'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }

  function render(){
    const pack = currentPack || store[currentPackId];
    const box = document.getElementById('v43PackContent');
    if (!box) return;

    if (!pack) {
      box.innerHTML = '<p class="text-xs text-slate-500 italic">Belum ada Document Pack.</p>';
    } else {
      const docs = TYPES.map(type => {
        const d = (pack.documents || []).slice().reverse().find(x => x.type === type.type);
        const fallbackId = documentIdFor(pack.source, pack.template, type.type);
        return `<div class="bg-slate-950 border border-slate-800 rounded-xl p-3">
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0"><b class="text-xs text-slate-200">${esc(d?.label || type.label)}</b>
              <div class="text-[11px] text-slate-500 mt-1">${d ? `hash ${esc(d.contentHash)} · ${esc(new Date(d.generatedAt).toLocaleString('id-ID'))}` : 'Belum dibuat'}</div>
            </div>
            ${d ? `<button onclick="window.selectDocumentPackDocumentV43(${JSON.stringify(d.documentId)})" class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-[11px]">Muat</button>` : '<span class="text-[11px] text-slate-600">—</span>'}
          </div>
          <div class="text-[10px] text-slate-500 mt-2 break-all">Document ID: ${esc(d?.documentId || fallbackId)}</div>
          ${d?.revisionNumber ? `<div class="text-[10px] text-slate-500 mt-1">Revision: v${esc(d.revisionNumber)}${d.revisionId ? ` · ${esc(d.revisionId)}` : ''}</div>` : ''}
        </div>`;
      }).join('');
      box.innerHTML = `<div class="grid grid-cols-1 md:grid-cols-2 gap-2">${docs}</div>`;
    }

    const p = currentPack || store[currentPackId];
    const setText = (id, value) => { const el=document.getElementById(id); if(el) el.textContent=value; };
    setText('v43PackId', p?.packId || '-');
    setText('v43SourceId', p?.source?.meetingId || '-');
    setText('v43Template', p ? `${p.template.name} · v${p.template.version}` : '-');
    setText('v43DocumentCount', `${new Set((p?.documents || []).map(x=>x.documentId)).size}/6`);
  }

  function injectUI(){
    if (document.getElementById('phase43PackPanel')) return true;
    const docsTab = document.getElementById('docsTab');
    if (!docsTab) return false;

    const panel = document.createElement('div');
    panel.id = 'phase43PackPanel';
    panel.className = 'bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl mt-4';
    panel.innerHTML = `<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
      <div><h3 class="font-semibold">📦 PHASE 4.3 — Multi-Document Generation & Document Pack</h3>
      <p class="text-xs text-slate-500 mt-1">Satu meeting menghasilkan paket dokumen terhubung dengan satu Pack ID, source snapshot, template version, dan traceability revision.</p></div>
      <div class="flex flex-wrap gap-2">
        <button onclick="window.generateDocumentPackV43()" class="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-semibold">📦 Generate Document Pack</button>
        <button onclick="window.exportDocumentPackV43()" class="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs">JSON Pack</button>
        <button onclick="window.runPhase43SelfTest()" class="px-3 py-2 bg-emerald-700 hover:bg-emerald-600 rounded-lg text-xs">✓ Self-Test</button>
      </div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
      <div class="bg-slate-950 border border-slate-800 rounded-xl p-3"><div class="text-[11px] text-slate-500">Pack ID</div><div id="v43PackId" class="text-xs font-mono text-slate-300 mt-1 break-all">-</div></div>
      <div class="bg-slate-950 border border-slate-800 rounded-xl p-3"><div class="text-[11px] text-slate-500">Meeting Source</div><div id="v43SourceId" class="text-xs text-slate-300 mt-1 break-all">-</div></div>
      <div class="bg-slate-950 border border-slate-800 rounded-xl p-3"><div class="text-[11px] text-slate-500">Template</div><div id="v43Template" class="text-xs text-slate-300 mt-1">-</div></div>
      <div class="bg-slate-950 border border-slate-800 rounded-xl p-3"><div class="text-[11px] text-slate-500">Dokumen</div><div id="v43DocumentCount" class="text-lg font-bold text-indigo-400 mt-1">0/6</div></div>
    </div>
    <div id="v43PackContent"><p class="text-xs text-slate-500 italic">Belum ada Document Pack.</p></div>`;
    docsTab.appendChild(panel);
    return true;
  }

  function selfTest(){
    const tests = [];
    const check = (name, passed, detail='') => tests.push({name, passed:Boolean(passed), detail});
    const sourceBefore = JSON.stringify({meetingHistory:window.meetingHistory, analysis:window.currentAnalysisResult});
    const s = sourceSnapshot();
    const t = getTemplateMeta();

    check('Schema version', SCHEMA_VERSION === '4.3.1');
    check('Document type catalog', TYPES.length === 6 && new Set(TYPES.map(x=>x.type)).size === 6);
    check('Pack ID deterministic', packIdFor(s,t) === packIdFor(s,t));
    check('Document ID deterministic', documentIdFor(s,t,TYPES[0].type) === documentIdFor(s,t,TYPES[0].type));
    check('Storage isolation', STORAGE_KEY !== 'meeting_ai_document_revisions_v42' && STORAGE_KEY !== 'meeting_ai_history');
    check('Source snapshot available', Boolean(s.meetingId && s.title));
    check('Generator available', Boolean(getGenerator()));
    check('Revision bridge available', typeof window.buildRevisionSnapshotV42 === 'function' || typeof window.saveCurrentDocumentRevisionV42 === 'function');
    check('UI injected', Boolean(document.getElementById('phase43PackPanel')));
    check('Source untouched by self-test', sourceBefore === JSON.stringify({meetingHistory:window.meetingHistory, analysis:window.currentAnalysisResult}));

    const report = {phase:'4.3.1', timestamp:new Date().toISOString(), ok:tests.every(x=>x.passed), results:tests, storageKey:STORAGE_KEY};
    console.groupCollapsed(`Phase 4.3 Document Pack: ${report.ok ? 'PASS' : 'CHECK'}`);
    console.table(tests); console.log(report); console.groupEnd();
    toast(`Phase 4.3 Self-Test: ${report.ok ? 'PASS' : 'CHECK'}`, report.ok ? 'success' : 'warning');
    return report;
  }

  function init(){
    load();
    if (!injectUI()) {
      let attempts = 0;
      const timer = setInterval(() => {
        attempts++;
        if (injectUI() || attempts >= 20) clearInterval(timer);
        if (attempts >= 20 && !document.getElementById('phase43PackPanel')) console.warn('Phase 4.3 UI target #docsTab tidak ditemukan.');
      }, 100);
    }
    const keys = Object.keys(store);
    if (keys.length) {
      currentPackId = keys[0];
      currentPack = store[currentPackId];
    }
    render();
  }

  window.generateDocumentPackV43 = generatePack;
  window.selectDocumentPackDocumentV43 = selectPackDocument;
  window.exportDocumentPackV43 = exportPack;
  window.runPhase43SelfTest = selfTest;
  window.phase43DocumentTypes = TYPES;
  window.getPhase43DocumentPack = () => currentPack || store[currentPackId] || null;
  window.documentPackStoreV43 = store;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
