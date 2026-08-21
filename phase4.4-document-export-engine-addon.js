/*
 * Meeting Intelligence Ultimate — PHASE 4.4
 * Document Export Engine
 *
 * Additive export layer for Phase 4.3 / 4.3.1 / 4.3.2.
 * No existing document, meeting, revision, or pack store is replaced.
 * Browser-native exports: TXT, JSON, HTML, DOCX-compatible HTML, Print/PDF.
 */
(function(){
  'use strict';
  const SCHEMA_VERSION='4.4.0';
  const toast=(m,t='info')=>typeof window.showToast==='function'?window.showToast(m,t):console.log(m);
  const esc=v=>typeof window.escapeHTML==='function'?window.escapeHTML(v):String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));
  const safeName=v=>String(v||'Meeting').replace(/[^a-zA-Z0-9À-ÿ_-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,100)||'Meeting';
  const hash=value=>{let h=2166136261,s=String(value??'');for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0).toString(16).padStart(8,'0')};

  function download(content,name,type){
    const blob=new Blob([content],{type});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  function currentDocument(){return window.currentGeneratedDocument||null}
  function currentPack(){
    const id=window.__phase431CurrentPackId;
    const store=window.documentPackStoreV43||{};
    if(id&&store[id]) return store[id];
    const values=Object.values(store);return values[0]||null;
  }
  function sourceMeta(d){
    const p=currentPack();
    return {
      documentId:d?.documentId||'',
      revisionId:d?.revisionId||d?.revision?.revisionId||'',
      packId:d?.packId||p?.packId||'',
      meetingId:d?.source?.meetingId||p?.source?.meetingId||'',
      template:d?.template||p?.template||{},
      contentHash:d?.contentHash||hash(d?.content||'')
    };
  }
  function payload(){
    const d=currentDocument();
    if(!d?.content) throw new Error('Belum ada dokumen aktif untuk diekspor.');
    const meta=sourceMeta(d);
    return {schemaVersion:SCHEMA_VERSION,exportedAt:new Date().toISOString(),document:{type:d.type||'',label:d.label||'',title:d.title||'Meeting',content:String(d.content),...meta}};
  }
  function htmlDocument(data){
    const m=data.document;
    return `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(m.title)}</title><style>body{font-family:Arial,sans-serif;line-height:1.55;max-width:900px;margin:40px auto;padding:0 24px;color:#111}h1{font-size:24px}pre{white-space:pre-wrap;font:inherit}.meta{font-size:12px;color:#555;border-bottom:1px solid #ddd;padding-bottom:12px;margin-bottom:24px}</style></head><body><h1>${esc(m.title)}</h1><div class="meta">${esc(m.label)} · Document ID: ${esc(m.documentId)} · Revision: ${esc(m.revisionId||'—')} · Pack: ${esc(m.packId||'—')} · Content Hash: ${esc(m.contentHash)}</div><pre>${esc(m.content)}</pre></body></html>`;
  }
  function txt(data){const m=data.document;return `${m.title}\n${m.label}\n\nDocument ID: ${m.documentId||'—'}\nRevision: ${m.revisionId||'—'}\nPack ID: ${m.packId||'—'}\nMeeting ID: ${m.meetingId||'—'}\nTemplate: ${m.template?.name||'—'} v${m.template?.version||'—'}\nContent Hash: ${m.contentHash}\n\n${m.content}\n`}
  function exportJSON(){const d=payload();download(JSON.stringify(d,null,2),`${safeName(d.document.title)}_${safeName(d.document.label)}.json`,'application/json;charset=utf-8');toast('JSON berhasil diekspor.','success');return d}
  function exportTXT(){const d=payload();download(txt(d),`${safeName(d.document.title)}_${safeName(d.document.label)}.txt`,'text/plain;charset=utf-8');toast('TXT berhasil diekspor.','success');return d}
  function exportHTML(){const d=payload();download(htmlDocument(d),`${safeName(d.document.title)}_${safeName(d.document.label)}.html`,'text/html;charset=utf-8');toast('HTML berhasil diekspor.','success');return d}
  function exportDOCX(){const d=payload();const html=htmlDocument(d);download('\ufeff'+html,`${safeName(d.document.title)}_${safeName(d.document.label)}.doc`,'application/msword;charset=utf-8');toast('DOC berhasil diekspor dalam format Word-compatible.','success');return d}
  function printPDF(){const d=payload();const w=window.open('','_blank','noopener,noreferrer');if(!w){toast('Popup diblokir browser. Izinkan popup untuk Print/PDF.','warning');return null}w.document.open();w.document.write(htmlDocument(d).replace('</body>','<script>window.onload=function(){setTimeout(function(){window.print()},150)}<\/script></body>'));w.document.close();return d}
  function exportPackJSON(){const p=currentPack();if(!p)return toast('Belum ada Document Pack.','warning');const manifest={schemaVersion:SCHEMA_VERSION,exportedAt:new Date().toISOString(),pack:p,documents:(p.documents||[]).map(d=>({documentId:d.documentId,type:d.type,label:d.label,title:d.title,content:d.content,contentHash:d.contentHash,revision:d.revision||null,source:d.source||p.source,template:d.template||p.template}))};download(JSON.stringify(manifest,null,2),`DocumentPack_${safeName(p.packId)}.json`,'application/json;charset=utf-8');toast('Document Pack manifest JSON berhasil diekspor.','success');return manifest}
  function inject(){
    if(document.getElementById('phase44ExportPanel'))return;
    const target=document.getElementById('phase43PackPanel')||document.getElementById('docsTab');if(!target)return;
    const panel=document.createElement('div');panel.id='phase44ExportPanel';panel.className='mt-4 pt-4 border-t border-slate-800';
    panel.innerHTML=`<div class="text-xs font-semibold text-slate-200">PHASE 4.4 — Document Export Engine</div><div class="text-[11px] text-slate-500 mt-1">Export tidak mengubah source meeting, Document Pack, atau revision ledger.</div><div class="flex flex-wrap gap-2 mt-3"><button onclick="window.exportCurrentDocumentTXT_V44()" class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-[11px]">TXT</button><button onclick="window.exportCurrentDocumentJSON_V44()" class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-[11px]">JSON</button><button onclick="window.exportCurrentDocumentHTML_V44()" class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-[11px]">HTML</button><button onclick="window.exportCurrentDocumentDOCX_V44()" class="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-[11px]">Word</button><button onclick="window.printCurrentDocumentPDF_V44()" class="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 rounded-lg text-[11px]">Print / PDF</button><button onclick="window.exportDocumentPackJSON_V44()" class="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-[11px]">Pack JSON</button></div><div class="text-[10px] text-slate-600 mt-2">Catatan: tombol Print / PDF memakai dialog cetak browser; PDF final dibuat oleh browser/OS.</div>`;
    target.appendChild(panel);
  }
  function selfTest(){
    const tests=[],c=(n,p,d='')=>tests.push({name:n,passed:Boolean(p),detail:d});
    c('Schema 4.4.0',SCHEMA_VERSION==='4.4.0');
    c('Download API',typeof Blob==='function'&&typeof URL.createObjectURL==='function');
    c('TXT exporter',typeof exportTXT==='function');
    c('JSON exporter',typeof exportJSON==='function');
    c('HTML exporter',typeof exportHTML==='function');
    c('Word-compatible exporter',typeof exportDOCX==='function');
    c('Print/PDF exporter',typeof printPDF==='function');
    c('Pack JSON exporter',typeof exportPackJSON==='function');
    const report={phase:SCHEMA_VERSION,timestamp:new Date().toISOString(),ok:tests.every(x=>x.passed),results:tests};
    console.groupCollapsed(`Phase 4.4 Export Engine: ${report.ok?'PASS':'FAIL'}`);console.table(tests);console.log(report);console.groupEnd();toast(`Phase 4.4 Self-Test: ${report.ok?'PASS':'CHECK'}`,report.ok?'success':'warning');return report;
  }
  window.exportCurrentDocumentTXT_V44=exportTXT;
  window.exportCurrentDocumentJSON_V44=exportJSON;
  window.exportCurrentDocumentHTML_V44=exportHTML;
  window.exportCurrentDocumentDOCX_V44=exportDOCX;
  window.printCurrentDocumentPDF_V44=printPDF;
  window.exportDocumentPackJSON_V44=exportPackJSON;
  window.runPhase44SelfTest=selfTest;
  window.getPhase44ExportPayload=payload;
  const boot=()=>setTimeout(inject,0);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
