/*
 * Meeting Intelligence Ultimate — PHASE 4.4
 * Document Export Engine
 *
 * Non-destructive addon. It reads the Phase 4.3 pack namespace and never
 * mutates meetingHistory, transcript, analysis, Knowledge Graph, or revisions.
 */
(function(){
  'use strict';
  const PACK_KEY='meeting_ai_document_packs_v43';
  const TYPES=[
    {type:'officialReport',label:'Laporan Dinas'},
    {type:'minutes',label:'Notulen'},
    {type:'beritaAcara',label:'Berita Acara'},
    {type:'executiveBrief',label:'Executive Brief'},
    {type:'followUpMemo',label:'Memo Tindak Lanjut'},
    {type:'actionTracker',label:'Action Tracker'}
  ];
  function readPacks(){try{const x=JSON.parse(localStorage.getItem(PACK_KEY)||'{}');return x&&typeof x==='object'&&!Array.isArray(x)?x:{};}catch(e){return {};}}
  function currentPack(){if(window.currentPackV43)return window.currentPackV43;const id=window.currentPackIdV43;const s=readPacks();if(id&&s[id])return s[id];const ids=Object.keys(s);return ids.length?s[ids[ids.length-1]]:null;}
  function safeName(v){return String(v||'Meeting').trim().replace(/[^a-zA-Z0-9_-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,100)||'Meeting';}
  function download(text,name,type){if(typeof window.downloadFile==='function')return window.downloadFile(text,name,type);const blob=new Blob([text],{type});const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000);}
  function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}
  function markdownDoc(pack,doc){return `# ${doc.title||doc.label}\n\n**Document Type:** ${doc.label}\n**Document ID:** ${doc.documentId}\n**Pack ID:** ${pack.packId}\n**Revision:** ${doc.revisionNumber?`v${doc.revisionNumber}`:'—'}\n**Template:** ${pack.template?.name||'—'} v${pack.template?.version||'—'}\n**Generated:** ${doc.generatedAt||'—'}\n\n---\n\n${doc.content||''}\n`}
  function htmlDoc(pack,doc){return '<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(doc.title||doc.label)+'</title><style>body{font-family:Arial,sans-serif;max-width:900px;margin:40px auto;padding:0 20px;line-height:1.6;color:#172033}h1{margin-bottom:4px}.meta{color:#667085;font-size:13px;border-bottom:1px solid #ddd;padding-bottom:14px;margin-bottom:24px;white-space:pre-wrap}.content{white-space:pre-wrap}</style></head><body><h1>'+esc(doc.title||doc.label)+'</h1><div class="meta">'+esc(doc.label)+'\nDocument ID: '+esc(doc.documentId)+'\nPack ID: '+esc(pack.packId)+'\nRevision: '+esc(doc.revisionNumber?'v'+doc.revisionNumber:'—')+'</div><div class="content">'+esc(doc.content||'')+'</div></body></html>';}
  function exportDocument(type,format){const pack=currentPack();if(!pack)throw new Error('Document Pack belum tersedia.');const doc=(pack.documents||[]).slice().reverse().find(x=>x.type===type);if(!doc)throw new Error('Dokumen '+type+' belum tersedia.');const base=safeName(pack.source?.title)+'_'+type; if(format==='txt')download(String(doc.content||''),base+'.txt','text/plain;charset=utf-8');else if(format==='md')download(markdownDoc(pack,doc),base+'.md','text/markdown;charset=utf-8');else download(htmlDoc(pack,doc),base+'.html','text/html;charset=utf-8');}
  function exportPackJSON(){const p=currentPack();if(!p)throw new Error('Document Pack belum tersedia.');download(JSON.stringify(p,null,2),'DocumentPack_'+safeName(p.source?.title)+'.json','application/json;charset=utf-8');}
  function exportPackMarkdown(){const p=currentPack();if(!p)throw new Error('Document Pack belum tersedia.');const body=(p.documents||[]).map(d=>markdownDoc(p,d)).join('\n\n---\n\n');download(`# Document Pack\n\n**Pack ID:** ${p.packId}\n\n${body}`,'DocumentPack_'+safeName(p.source?.title)+'.md','text/markdown;charset=utf-8');}
  function runPhase44SelfTest(){const p=currentPack();const r=[['Pack namespace readable',!!p||Object.keys(readPacks()).length===0],['Export JSON function',typeof exportPackJSON==='function'],['Export Markdown function',typeof exportPackMarkdown==='function'],['Per-document exporter',typeof exportDocument==='function']];const report={phase:'4.4',timestamp:new Date().toISOString(),ok:r.every(x=>x[1]),results:r};console.groupCollapsed('Phase 4.4 Export Engine: '+(report.ok?'PASS':'CHECK'));console.table(r);console.log(report);console.groupEnd();return report;}
  window.exportDocumentV44=exportDocument;window.exportDocumentPackJSONV44=exportPackJSON;window.exportDocumentPackMarkdownV44=exportPackMarkdown;window.runPhase44SelfTest=runPhase44SelfTest;
})();
