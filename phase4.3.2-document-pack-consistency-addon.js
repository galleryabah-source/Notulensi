/*
 * Meeting Intelligence Ultimate — PHASE 4.3.2
 * Document Pack Consistency & Atomic Generation
 *
 * Non-destructive addon for Phase 4.3 / 4.3.1.
 * Validates a pack against one immutable source snapshot before commit.
 * A generation attempt is staged in memory and persisted only when the
 * complete requested pack passes consistency validation.
 */
(function(){
  'use strict';

  const STORAGE_KEY='meeting_ai_document_packs_v43';
  const SCHEMA_VERSION='4.3.2';
  const TYPES=Array.isArray(window.phase43DocumentTypes) ? window.phase43DocumentTypes.slice() : [];
  const REVISION_STORE_KEY='meeting_ai_document_pack_revisions_v431';

  const get=k=>{try{return localStorage.getItem(k)}catch(e){return null}};
  const set=(k,v)=>{try{localStorage.setItem(k,v);return true}catch(e){return false}};
  const toast=(m,t='info')=>typeof window.showToast==='function'?window.showToast(m,t):console.log(m);
  const esc=v=>typeof window.escapeHTML==='function'?window.escapeHTML(v):String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));
  const hash=value=>{let h=2166136261,s=String(value??'');for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0).toString(16).padStart(8,'0')};
  const clone=v=>JSON.parse(JSON.stringify(v));

  function currentMeeting(){
    if(typeof window.getCurrentMeetingForDocuments==='function') return window.getCurrentMeetingForDocuments()||{};
    return window.currentAnalysisResult||{};
  }
  function templateMeta(){
    const id=window.activeDocumentTemplateV41||'builtin-unknown';
    const t=(window.documentTemplatesV41||{})[id]||{};
    return {id,name:t.name||id,version:t.version||'1.0.0'};
  }
  function sourceSnapshot(){
    const m=currentMeeting(), t=templateMeta();
    const transcript=String(m?.transcript||'');
    const analysis=JSON.stringify(m?.analysis||{});
    return {
      meetingId:String(m?.id||'current-meeting'),
      title:String(m?.title||''),
      transcriptHash:hash(transcript),
      analysisHash:hash(analysis),
      template:{id:t.id,name:t.name,version:t.version}
    };
  }
  function loadPacks(){
    try{const x=JSON.parse(get(STORAGE_KEY)||'{}');return x&&typeof x==='object'&&!Array.isArray(x)?x:{}}
    catch(e){return {}}
  }
  function persistPacks(store){
    if(!set(STORAGE_KEY,JSON.stringify(store))) throw new Error('Gagal menyimpan Document Pack.');
    if(window.documentPackStoreV43 && typeof window.documentPackStoreV43==='object'){
      Object.keys(window.documentPackStoreV43).forEach(k=>delete window.documentPackStoreV43[k]);
      Object.assign(window.documentPackStoreV43,store);
    }
  }

  function expectedDocumentId(source,type){
    return `DOC-${source.meetingId}-${type}-${source.template.id}`;
  }
  function getDocument(pack,type){
    return (pack?.documents||[]).find(d=>d.type===type) || null;
  }

  function validatePack(pack, expectedTypes=TYPES.map(x=>x.type), expectedSource=sourceSnapshot()){
    const checks=[];
    const add=(name,passed,detail='')=>checks.push({name,passed:Boolean(passed),detail});
    add('Pack exists',!!pack);
    if(!pack) return {ok:false,checks};

    add('Schema compatible',String(pack.schemaVersion||'').startsWith('4.3'));
    add('Meeting source matches',String(pack.source?.meetingId||'')===expectedSource.meetingId,
      `${pack.source?.meetingId||'—'} vs ${expectedSource.meetingId}`);
    add('Transcript hash matches',pack.source?.transcriptHash===expectedSource.transcriptHash,
      `${pack.source?.transcriptHash||'—'} vs ${expectedSource.transcriptHash}`);
    add('Analysis hash matches',pack.source?.analysisHash===expectedSource.analysisHash,
      `${pack.source?.analysisHash||'—'} vs ${expectedSource.analysisHash}`);
    add('Template ID matches',pack.template?.id===expectedSource.template.id);
    add('Template version matches',pack.template?.version===expectedSource.template.version);
    add('Document collection exists',Array.isArray(pack.documents));

    const docs=pack.documents||[];
    const uniqueIds=new Set(docs.map(d=>d.documentId));
    add('Document IDs unique',uniqueIds.size===docs.length);
    const uniqueTypes=new Set(docs.map(d=>d.type));
    add('Document types unique',uniqueTypes.size===docs.length);

    for(const type of expectedTypes){
      const d=getDocument(pack,type);
      add(`${type}: present`,!!d);
      if(d){
        add(`${type}: document ID`,d.documentId===expectedDocumentId(expectedSource,type));
        add(`${type}: pack ID`,d.packId===pack.packId);
        add(`${type}: meeting source`,d.source?.meetingId===expectedSource.meetingId);
        add(`${type}: transcript hash`,d.source?.transcriptHash===expectedSource.transcriptHash);
        add(`${type}: analysis hash`,d.source?.analysisHash===expectedSource.analysisHash);
        add(`${type}: template version`,d.template?.version===expectedSource.template.version);
        add(`${type}: content hash`,d.contentHash===hash(d.content||''));
        add(`${type}: non-empty`,String(d.content||'').trim().length>0);
      }
    }

    const expectedSet=new Set(expectedTypes);
    add('No unexpected document types',docs.every(d=>expectedSet.has(d.type)));
    return {ok:checks.every(x=>x.passed),checks,schemaVersion:SCHEMA_VERSION,validatedAt:new Date().toISOString(),source:clone(expectedSource),packId:pack.packId};
  }

  async function stageDocuments(types,source,basePack){
    if(!types.length) throw new Error('Tidak ada tipe dokumen untuk dibuat.');
    const staged=[];
    for(const type of types){
      if(!TYPES.some(x=>x.type===type)) throw new Error(`Tipe dokumen tidak dikenal: ${type}`);
      if(typeof window.generateDocumentV4!=='function' && typeof window.generateDocument!=='function') throw new Error('Document generation engine tidak tersedia.');
      const generator=typeof window.generateDocumentV4==='function'?window.generateDocumentV4:window.generateDocument;
      const previous=window.currentGeneratedDocument;
      await Promise.resolve(generator(type));
      const d=window.currentGeneratedDocument||previous;
      if(!d?.content) throw new Error(`${type}: output dokumen kosong.`);
      staged.push({
        documentId:expectedDocumentId(source,type),
        packId:basePack.packId,
        type,
        label:d.label||(TYPES.find(x=>x.type===type)||{}).label||type,
        title:d.title||source.title,
        content:String(d.content),
        contentHash:hash(d.content),
        template:{...source.template},
        source:{...source},
        generationMode:d.generationMode||'document-pack-atomic',
        generatedAt:new Date().toISOString()
      });
    }
    return staged;
  }

  function updateRevisionLedger(pack,documents){
    const raw=get(REVISION_STORE_KEY);
    if(!raw) return;
    let ledger; try{ledger=JSON.parse(raw)}catch(e){return}
    if(!ledger||typeof ledger!=='object'||Array.isArray(ledger)) return;
    const now=new Date().toISOString();
    for(const d of documents){
      const key=`${d.packId}::${d.documentId}`;
      const entry=ledger[key]||{schemaVersion:'4.3.1',packId:d.packId,documentId:d.documentId,type:d.type,label:d.label,title:d.title,revisions:[],currentRevisionId:null,createdAt:now,updatedAt:now};
      const same=(entry.revisions||[]).find(r=>r.contentHash===d.contentHash && r.template?.version===d.template?.version);
      if(same){entry.currentRevisionId=same.revisionId;entry.updatedAt=now;ledger[key]=entry;continue}
      const n=(entry.revisions||[]).length+1;
      const revision={revisionId:`${d.documentId}-v${n}`,revision:n,packId:d.packId,documentId:d.documentId,type:d.type,label:d.label,title:d.title,content:d.content,contentHash:d.contentHash,source:{...d.source},template:{...d.template},phase42Revision:null,generationMode:d.generationMode||'document-pack-atomic',generatedAt:d.generatedAt,capturedAt:now};
      entry.revisions=entry.revisions||[]; entry.revisions.push(revision); entry.currentRevisionId=revision.revisionId; entry.updatedAt=now; ledger[key]=entry;
    }
    set(REVISION_STORE_KEY,JSON.stringify(ledger));
    if(window.documentPackRevisionLedgerV431 && typeof window.documentPackRevisionLedgerV431==='object'){
      Object.keys(window.documentPackRevisionLedgerV431).forEach(k=>delete window.documentPackRevisionLedgerV431[k]);
      Object.assign(window.documentPackRevisionLedgerV431,ledger);
    }
  }

  async function generateAtomic(types=TYPES.map(x=>x.type)){
    const source=sourceSnapshot();
    const packs=loadPacks();
    const packId=`PACK-${source.meetingId}-${source.template.id}`;
    const existing=packs[packId];
    const base=existing?clone(existing):{
      schemaVersion:'4.3',packId,source:{meetingId:source.meetingId,title:source.title,transcriptHash:source.transcriptHash,analysisHash:source.analysisHash},template:{...source.template},createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),documents:[]
    };

    // Never stage on a stale pack. If source changed, rebuild the complete pack.
    if(existing){
      const oldSource={...existing.source,template:existing.template};
      const oldCheck=validatePack({...existing,documents:[]},[],source);
      if(!oldCheck.checks.find(x=>x.name==='Meeting source matches')?.passed ||
         !oldCheck.checks.find(x=>x.name==='Transcript hash matches')?.passed ||
         !oldCheck.checks.find(x=>x.name==='Analysis hash matches')?.passed ||
         existing.template?.version!==source.template.version){
        base.documents=[];
      }
      void oldSource;
    }

    const staged=await stageDocuments(types,source,base);
    const candidate=clone(base);
    const map=new Map((candidate.documents||[]).map(d=>[d.type,d]));
    staged.forEach(d=>map.set(d.type,d));
    candidate.documents=Array.from(map.values());
    candidate.source={meetingId:source.meetingId,title:source.title,transcriptHash:source.transcriptHash,analysisHash:source.analysisHash};
    candidate.template={...source.template};
    candidate.updatedAt=new Date().toISOString();

    const validation=validatePack(candidate,types,source);
    if(!validation.ok){
      console.warn('Phase 4.3.2 atomic generation rejected',validation);
      toast('Document Pack ditolak: consistency check gagal. Tidak ada perubahan disimpan.','error');
      return {ok:false,atomicCommitted:false,validation,pack:null};
    }

    // Commit happens only after every requested document and every consistency rule pass.
    packs[packId]=candidate;
    persistPacks(packs);
    window.__phase431CurrentPackId=packId;
    updateRevisionLedger(candidate,staged);
    if(typeof window.selectDocumentPackDocumentV43==='function' && staged[0]) window.selectDocumentPackDocumentV43(staged[0].documentId);
    const result={ok:true,atomicCommitted:true,pack:candidate,documents:staged,validation};
    toast(`Document Pack atomic berhasil: ${staged.length}/${types.length} dokumen konsisten.`,'success');
    return result;
  }

  function inspectCurrent(){
    const packs=loadPacks();
    const source=sourceSnapshot();
    const packId=`PACK-${source.meetingId}-${source.template.id}`;
    const pack=packs[packId]||null;
    const validation=validatePack(pack,TYPES.map(x=>x.type),source);
    return validation;
  }

  function render(){
    const host=document.getElementById('phase432ConsistencyPanel');
    if(!host) return;
    const report=inspectCurrent();
    const failures=report.checks.filter(x=>!x.passed);
    const status=report.ok?'CONSISTENT':'STALE / INCOMPLETE';
    host.innerHTML=`<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3"><div><div class="text-xs font-semibold text-slate-200">PHASE 4.3.2 — Pack Consistency & Atomic Generation</div><div class="text-[11px] text-slate-500 mt-1">${esc(report.packId||'Belum ada pack')} · ${esc(report.validatedAt||'')}</div></div><div class="flex items-center gap-2"><span class="px-2.5 py-1 rounded-full text-[11px] ${report.ok?'bg-emerald-900 text-emerald-300':'bg-rose-900 text-rose-300'}">${status}</span><button onclick="window.generateAtomicDocumentPackV432()" class="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-semibold">⚛ Generate Atomic Pack</button><button onclick="window.inspectDocumentPackConsistencyV432()" class="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs">Inspect</button><button onclick="window.runPhase432SelfTest()" class="px-3 py-2 bg-emerald-700 hover:bg-emerald-600 rounded-lg text-xs">✓ Self-Test</button></div></div><div class="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3"><div class="bg-slate-950 border border-slate-800 rounded-xl p-3"><div class="text-[11px] text-slate-500">Meeting</div><div class="text-xs text-slate-300 mt-1">${esc(report.source?.meetingId||'—')}</div></div><div class="bg-slate-950 border border-slate-800 rounded-xl p-3"><div class="text-[11px] text-slate-500">Transcript Hash</div><div class="text-xs font-mono text-slate-300 mt-1">${esc(report.source?.transcriptHash||'—')}</div></div><div class="bg-slate-950 border border-slate-800 rounded-xl p-3"><div class="text-[11px] text-slate-500">Analysis Hash</div><div class="text-xs font-mono text-slate-300 mt-1">${esc(report.source?.analysisHash||'—')}</div></div></div><div class="mt-3 space-y-1 max-h-48 overflow-auto">${(report.checks||[]).map(x=>`<div class="text-[11px] ${x.passed?'text-emerald-400':'text-rose-400'}">${x.passed?'✓':'✕'} ${esc(x.name)}${x.detail?' — '+esc(x.detail):''}</div>`).join('')}</div>${failures.length?`<div class="text-[11px] text-amber-400 mt-3">${failures.length} consistency check belum terpenuhi. Atomic generation tidak akan melakukan partial commit.</div>`:''}`;
  }

  function selfTest(){
    const tests=[],c=(name,passed,detail='')=>tests.push({name,passed:Boolean(passed),detail});
    const source=sourceSnapshot();
    c('Schema version','4.3.2'==='4.3.2');
    c('Six document catalog',TYPES.length===6);
    c('Deterministic source hash',source.transcriptHash===hash(String(currentMeeting()?.transcript||'')) && source.analysisHash===hash(JSON.stringify(currentMeeting()?.analysis||{})));
    c('Expected document IDs deterministic',TYPES.every(t=>expectedDocumentId(source,t.type)===`DOC-${source.meetingId}-${t.type}-${source.template.id}`));
    c('Pack storage isolated',STORAGE_KEY==='meeting_ai_document_packs_v43');
    c('Revision store isolated',REVISION_STORE_KEY==='meeting_ai_document_pack_revisions_v431');
    c('Consistency validator available',typeof window.inspectDocumentPackConsistencyV432==='function');
    c('Atomic generator available',typeof window.generateAtomicDocumentPackV432==='function');
    const report={phase:SCHEMA_VERSION,timestamp:new Date().toISOString(),ok:tests.every(x=>x.passed),results:tests};
    console.groupCollapsed(`Phase 4.3.2 Pack Consistency: ${report.ok?'PASS':'FAIL'}`);console.table(tests);console.log(report);console.groupEnd();
    toast(`Phase 4.3.2 Self-Test: ${report.ok?'PASS':'CHECK'}`,report.ok?'success':'warning');
    return report;
  }

  function inject(){
    if(document.getElementById('phase432ConsistencyPanel')) return;
    const target=document.getElementById('phase43PackPanel');
    if(!target) return;
    const panel=document.createElement('div');
    panel.id='phase432ConsistencyPanel';
    panel.className='mt-4 pt-4 border-t border-slate-800';
    target.appendChild(panel);
    render();
  }

  function init(){inject();render();}
  window.generateAtomicDocumentPackV432=generateAtomic;
  window.inspectDocumentPackConsistencyV432=()=>{const r=inspectCurrent();render();console.table(r.checks);return r};
  window.runPhase432SelfTest=selfTest;
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(init,0),{once:true}); else setTimeout(init,0);
})();
