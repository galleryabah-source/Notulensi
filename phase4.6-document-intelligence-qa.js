/* Meeting Intelligence Ultimate — PHASE 4.6
 * Document Intelligence QA & Regression Gate
 *
 * Read-only QA harness. It does not mutate meetingHistory, transcript,
 * analysis, revision store, document pack store, or templates.
 * It validates runtime bridges and performs isolated synthetic checks.
 */
(function(){
  'use strict';

  const PHASE='4.6';
  const CORE_FUNCTIONS=[
    'startRecording','stopRecording','startTimer','processFullAnalysis',
    'callGeminiAPI','runAITask','saveHistoryToStorage','loadHistoryFromStorage',
    'renderHistoryList','loadHistoryItem'
  ];
  const DOC_FUNCTIONS=[
    'buildRevisionSnapshotV42','restoreDocumentRevisionV42',
    'selectDocumentPackDocumentV43','exportDocumentV44',
    'exportDocumentPackJSONV44','exportDocumentPackMarkdownV44'
  ];

  function result(name,passed,detail){ return {name,passed:Boolean(passed),detail:detail||''}; }
  function hash(value){
    if(typeof window.hashTextV42==='function') return window.hashTextV42(value);
    let h=2166136261; const s=String(value??'');
    for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}
    return (h>>>0).toString(16).padStart(8,'0');
  }
  function safeJson(key,fallback){
    try{const v=JSON.parse(localStorage.getItem(key)||'');return v&&typeof v==='object'&&!Array.isArray(v)?v:fallback;}
    catch(e){return fallback;}
  }
  function checkCore(r){
    CORE_FUNCTIONS.forEach(name=>r.push(result(`Baseline function: ${name}`,typeof window[name]==='function')));
    r.push(result('Baseline recording state present',typeof window.isRecording!=='undefined' || typeof window.recognition!=='undefined'));
    r.push(result('Meeting history store present',typeof window.meetingHistory!=='undefined'));
  }
  function checkDocumentBridges(r){
    DOC_FUNCTIONS.forEach(name=>r.push(result(`Document bridge: ${name}`,typeof window[name]==='function')));
    r.push(result('Phase 4.2 revision store shape',!!window.documentRevisionStoreV42 && typeof window.documentRevisionStoreV42==='object' && !Array.isArray(window.documentRevisionStoreV42)));
    r.push(result('Phase 4.3 pack store readable',(()=>{const x=safeJson('meeting_ai_document_packs_v43',{});return x&&typeof x==='object'&&!Array.isArray(x);})()));
  }
  function syntheticRevisionChecks(r){
    const a='synthetic document A', b='synthetic document B';
    r.push(result('Deterministic content hash',hash(a)===hash(a)));
    r.push(result('Different content hash',hash(a)!==hash(b)));
    const revisions=[];
    const push=(content,templateVersion)=>{
      const contentHash=hash(content),last=revisions[revisions.length-1];
      if(last&&last.contentHash===contentHash&&last.templateVersion===templateVersion)return last;
      const x={revisionId:`DOC-QA:r${revisions.length+1}`,revision:revisions.length+1,content,contentHash,templateVersion};
      revisions.push(x);return x;
    };
    push(a,'1.0.0'); push(a,'1.0.0');
    r.push(result('Anti-duplicate synthetic revision',revisions.length===1,`count=${revisions.length}`));
    push(b,'1.0.0');
    r.push(result('Changed content creates next revision',revisions.length===2 && revisions[1].revision===2));
    push(b,'1.1.0');
    r.push(result('Template change creates next revision',revisions.length===3 && revisions[2].revision===3));
    r.push(result('Revision IDs unique',new Set(revisions.map(x=>x.revisionId)).size===revisions.length));
  }
  function packChecks(r){
    const docs=[
      {documentId:'DOC-QA-officialReport-template',contentHash:hash('A')},
      {documentId:'DOC-QA-minutes-template',contentHash:hash('B')}
    ];
    const duplicate={documentId:'DOC-QA-officialReport-template',contentHash:hash('A')};
    const before=docs.length;
    const exists=docs.some(x=>x.documentId===duplicate.documentId&&x.contentHash===duplicate.contentHash);
    if(!exists)docs.push(duplicate);
    r.push(result('Pack anti-duplicate synthetic',docs.length===before));
    r.push(result('Pack document IDs distinct',new Set(docs.map(x=>x.documentId)).size===2));
    r.push(result('Pack document count invariant',docs.length<=6));
  }
  function traceabilityChecks(r){
    const source={meetingId:'QA-MEETING',transcriptHash:hash('transcript'),analysisHash:hash('analysis')};
    const template={id:'qa-template',version:'1.0.0'};
    const docId=`DOC-${source.meetingId}-officialReport-${template.id}`;
    const trace={schemaVersion:PHASE,documentId:docId,source,template};
    r.push(result('Document ID deterministic',trace.documentId===`DOC-QA-MEETING-officialReport-qa-template`));
    r.push(result('Traceability source hashes present',Boolean(trace.source.transcriptHash&&trace.source.analysisHash)));
    r.push(result('Traceability template version present',trace.template.version==='1.0.0'));
  }
  function storageIntegrity(r){
    const keys=['meetingHistory','meeting_ai_document_revisions_v42','meeting_ai_document_packs_v43'];
    keys.forEach(key=>{
      try{
        const raw=localStorage.getItem(key);
        if(raw===null){r.push(result(`Storage readable: ${key}`,true,'Key belum ada; dianggap valid baseline kosong.'));return;}
        JSON.parse(raw);r.push(result(`Storage JSON valid: ${key}`,true));
      }catch(e){r.push(result(`Storage JSON valid: ${key}`,false,e.message));}
    });
  }
  function runPhase46SelfTest(){
    const r=[];
    checkCore(r);
    checkDocumentBridges(r);
    syntheticRevisionChecks(r);
    packChecks(r);
    traceabilityChecks(r);
    storageIntegrity(r);
    const report={phase:PHASE,timestamp:new Date().toISOString(),ok:r.every(x=>x.passed),results:r,mutation:'none'};
    console.groupCollapsed(`Phase ${PHASE} Document QA: ${report.ok?'PASS':'CHECK'}`);
    console.table(r);console.log(report);console.groupEnd();
    return report;
  }
  function render(){
    if(document.getElementById('phase46QAPanel'))return;
    const host=document.getElementById('docsTab')||document.body;
    const panel=document.createElement('section');panel.id='phase46QAPanel';
    panel.className='bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl mt-4';
    panel.innerHTML=`<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3"><div><h3 class="font-semibold text-slate-100">Phase 4.6 · Document Intelligence QA</h3><p class="text-[11px] text-slate-500 mt-1">Regression gate read-only · tidak mengubah data aplikasi.</p></div><button id="phase46Run" class="px-3 py-2 bg-indigo-700 hover:bg-indigo-600 rounded-lg text-xs">Run QA Gate</button></div><pre id="phase46Result" class="mt-3 text-[10px] text-slate-300 bg-slate-950 border border-slate-800 rounded-xl p-3 overflow-auto max-h-80">Belum dijalankan.</pre>`;
    host.appendChild(panel);
    document.getElementById('phase46Run').addEventListener('click',()=>{
      const report=runPhase46SelfTest();
      document.getElementById('phase46Result').textContent=JSON.stringify(report,null,2);
    });
  }
  window.runPhase46SelfTest=runPhase46SelfTest;
  window.phase46DocumentQAVersion=PHASE;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render,{once:true});else render();
})();
