/*
 * Meeting Intelligence Ultimate — PHASE 4.5
 * Document Distribution & Sharing
 *
 * Additive distribution layer for Phase 4.4.
 * No meeting/history/revision/pack stores are replaced.
 * Browser-only baseline: private snapshot, unlisted/share snapshot metadata,
 * Web Share API, clipboard, share-package JSON, and self-contained HTML.
 *
 * Important: without a backend, this layer does NOT create server-enforced
 * public URLs, authentication, expiry, or revocation. Those belong to a
 * future cloud distribution service.
 */
(function(){
  'use strict';

  const SCHEMA_VERSION='4.5.0';
  const SHARE_STORE_KEY='meeting_intelligence_share_snapshots_v45';
  const toast=(m,t='info')=>typeof window.showToast==='function'?window.showToast(m,t):console.log(m);
  const esc=v=>typeof window.escapeHTML==='function'?window.escapeHTML(v):String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));
  const safeName=v=>String(v||'Meeting').replace(/[^a-zA-Z0-9À-ÿ_-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,100)||'Meeting';
  const uid=()=>`SHARE-${Date.now()}-${Math.random().toString(36).slice(2,10)}`;
  const hash=value=>{let h=2166136261,s=String(value??'');for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0).toString(16).padStart(8,'0')};

  function currentDocument(){return window.currentGeneratedDocument||null}
  function currentPack(){
    const id=window.__phase431CurrentPackId;
    const store=window.documentPackStoreV43||{};
    if(id&&store[id])return store[id];
    return Object.values(store)[0]||null;
  }
  function getExportPayload(){
    if(typeof window.getPhase44ExportPayload==='function')return window.getPhase44ExportPayload();
    const d=currentDocument();
    if(!d?.content)throw new Error('Belum ada dokumen aktif.');
    const p=currentPack();
    return {schemaVersion:'4.4.0',exportedAt:new Date().toISOString(),document:{type:d.type||'',label:d.label||'',title:d.title||'Meeting',content:String(d.content),documentId:d.documentId||'',revisionId:d.revisionId||d?.revision?.revisionId||'',packId:d.packId||p?.packId||'',meetingId:d?.source?.meetingId||p?.source?.meetingId||'',template:d.template||p?.template||{},contentHash:d.contentHash||hash(d.content)}};
  }
  function readStore(){try{return JSON.parse(localStorage.getItem(SHARE_STORE_KEY)||'{}')}catch{return {}}}
  function writeStore(v){try{localStorage.setItem(SHARE_STORE_KEY,JSON.stringify(v));return true}catch{return false}}
  function buildSnapshot(visibility='private'){
    const payload=getExportPayload();
    const d=payload.document;
    const snapshot={
      schemaVersion:SCHEMA_VERSION,
      shareId:uid(),
      createdAt:new Date().toISOString(),
      visibility:visibility==='public'?'public':visibility==='unlisted'?'unlisted':'private',
      revoked:false,
      document:{
        documentId:d.documentId||'',revisionId:d.revisionId||'',packId:d.packId||'',meetingId:d.meetingId||'',
        type:d.type||'',label:d.label||'',title:d.title||'Meeting',content:String(d.content||''),
        contentHash:d.contentHash||hash(d.content||''),template:d.template||{}
      }
    };
    return snapshot;
  }
  function createShareSnapshot(visibility='private'){
    const s=buildSnapshot(visibility);const store=readStore();store[s.shareId]=s;
    if(!writeStore(store))throw new Error('Browser storage penuh atau tidak tersedia.');
    toast(`Share snapshot ${s.shareId} dibuat (${s.visibility}).`,'success');
    return s;
  }
  function revokeShareSnapshot(shareId){
    const store=readStore();if(!store[shareId])return false;store[shareId].revoked=true;store[shareId].revokedAt=new Date().toISOString();writeStore(store);toast('Share snapshot dicabut di browser ini.','success');return true;
  }
  function listShareSnapshots(){return Object.values(readStore()).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)))}
  function copyText(text){if(navigator.clipboard?.writeText)return navigator.clipboard.writeText(text);const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();return Promise.resolve()}
  function shareText(s){const d=s.document;return `${d.title}\n${d.label}\n\nDocument ID: ${d.documentId||'—'}\nRevision: ${d.revisionId||'—'}\nPack ID: ${d.packId||'—'}\nContent Hash: ${d.contentHash}\n\n${d.content}`}
  function copyShareText(){const s=createShareSnapshot('unlisted');return copyText(shareText(s)).then(()=>{toast('Snapshot dibuat dan isi dokumen disalin ke clipboard.','success');return s})}
  async function nativeShare(){
    const s=createShareSnapshot('unlisted');
    const text=shareText(s);
    if(!navigator.share){await copyText(text);toast('Web Share API tidak tersedia. Isi snapshot disalin ke clipboard.','info');return s}
    try{await navigator.share({title:s.document.title,text});toast('Dialog berbagi dibuka.','success')}catch(e){if(e?.name!=='AbortError')toast('Berbagi dibatalkan atau gagal.','warning')}
    return s;
  }
  function sharePackageJSON(){
    const s=createShareSnapshot('unlisted');
    const out={schemaVersion:SCHEMA_VERSION,exportedAt:new Date().toISOString(),shareSnapshot:s,capabilityNote:'Browser-only snapshot; server-side access control is not provided by Phase 4.5.'};
    const blob=new Blob([JSON.stringify(out,null,2)],{type:'application/json;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`Share_${safeName(s.document.title)}_${safeName(s.shareId)}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Share Package JSON berhasil dibuat.','success');return out;
  }
  function snapshotHTML(s){
    const d=s.document;
    return `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(d.title)}</title><style>body{font-family:Arial,sans-serif;line-height:1.55;max-width:900px;margin:40px auto;padding:0 24px;color:#111}h1{font-size:24px}.meta{font-size:12px;color:#555;border-bottom:1px solid #ddd;padding-bottom:12px;margin-bottom:24px}.badge{display:inline-block;border:1px solid #bbb;border-radius:999px;padding:2px 8px;margin-left:5px}pre{white-space:pre-wrap;font:inherit}</style></head><body><h1>${esc(d.title)}</h1><div class="meta">${esc(d.label)} <span class="badge">${esc(s.visibility)}</span><br>Share ID: ${esc(s.shareId)} · Document ID: ${esc(d.documentId||'—')} · Revision: ${esc(d.revisionId||'—')} · Pack: ${esc(d.packId||'—')} · Hash: ${esc(d.contentHash||'')}</div><pre>${esc(d.content)}</pre><hr><small>Generated by Meeting Intelligence Ultimate Phase 4.5 · ${esc(s.createdAt)}</small></body></html>`;
  }
  function exportShareHTML(){const s=createShareSnapshot('unlisted');const html=snapshotHTML(s);const blob=new Blob([html],{type:'text/html;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`Share_${safeName(s.document.title)}_${safeName(s.shareId)}.html`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Self-contained Share HTML berhasil dibuat.','success');return s}
  function inject(){
    if(document.getElementById('phase45SharePanel'))return;
    const target=document.getElementById('phase44ExportPanel')||document.getElementById('phase43PackPanel')||document.getElementById('docsTab');if(!target)return;
    const panel=document.createElement('div');panel.id='phase45SharePanel';panel.className='mt-4 pt-4 border-t border-slate-800';
    panel.innerHTML=`<div class="text-xs font-semibold text-slate-200">PHASE 4.5 — Document Distribution & Sharing</div><div class="text-[11px] text-slate-500 mt-1">Private/unlisted snapshot, clipboard, native share, dan portable share package. Public URL server-side belum tersedia pada arsitektur browser-only.</div><div class="flex flex-wrap gap-2 mt-3"><button onclick="window.createPrivateShareSnapshot_V45()" class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-[11px]">Private Snapshot</button><button onclick="window.copyShareSnapshot_V45()" class="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-[11px]">Copy Share</button><button onclick="window.nativeShareDocument_V45()" class="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 rounded-lg text-[11px]">Share</button><button onclick="window.exportSharePackageJSON_V45()" class="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-[11px]">Share JSON</button><button onclick="window.exportShareHTML_V45()" class="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-[11px]">Share HTML</button><button onclick="window.listShareSnapshots_V45()" class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-[11px]">List Snapshots</button></div><div class="text-[10px] text-slate-600 mt-2">Privacy note: browser-only snapshot bukan secure public sharing. Untuk URL publik, expiry, revoke lintas perangkat, auth, dan audit access diperlukan backend Phase Cloud.</div>`;
    target.appendChild(panel);
  }
  function selfTest(){
    const tests=[],c=(n,p,d='')=>tests.push({name:n,passed:Boolean(p),detail:d});
    c('Schema 4.5.0',SCHEMA_VERSION==='4.5.0');
    c('Snapshot builder',typeof buildSnapshot==='function');
    c('Local snapshot store',typeof localStorage!=='undefined');
    c('Clipboard fallback',typeof copyText==='function');
    c('Native share detection',typeof navigator.share==='function'||typeof navigator.share!=='undefined');
    c('Share package JSON',typeof sharePackageJSON==='function');
    c('Share HTML',typeof exportShareHTML==='function');
    c('Revoke mechanism',typeof revokeShareSnapshot==='function');
    const report={phase:SCHEMA_VERSION,timestamp:new Date().toISOString(),ok:tests.every(x=>x.passed),results:tests};console.groupCollapsed(`Phase 4.5 Distribution & Sharing: ${report.ok?'PASS':'FAIL'}`);console.table(tests);console.log(report);console.groupEnd();toast(`Phase 4.5 Self-Test: ${report.ok?'PASS':'CHECK'}`,report.ok?'success':'warning');return report;
  }
  window.createPrivateShareSnapshot_V45=()=>createShareSnapshot('private');
  window.copyShareSnapshot_V45=copyShareText;
  window.nativeShareDocument_V45=nativeShare;
  window.exportSharePackageJSON_V45=sharePackageJSON;
  window.exportShareHTML_V45=exportShareHTML;
  window.listShareSnapshots_V45=()=>{const v=listShareSnapshots();console.table(v);toast(`${v.length} snapshot tersimpan di browser ini.`,'info');return v};
  window.revokeShareSnapshot_V45=revokeShareSnapshot;
  window.runPhase45SelfTest=selfTest;
  window.getPhase45ShareSnapshots=()=>listShareSnapshots();
  const boot=()=>setTimeout(inject,0);if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();