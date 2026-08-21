(function(){
'use strict';
const KEY='meetingIntelligencePhase47Lifecycle';
const STATES=['draft','review','approved','final','archived'];
const TRANSITIONS={draft:['review'],review:['draft','approved'],approved:['review','final'],final:['archived'],archived:[]};
const REQUIRED=['officialReport','minutes','beritaAcara','executiveBrief','followUpMemo','actionTracker'];
function read(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch(e){return {}}}
function write(v){localStorage.setItem(KEY,JSON.stringify(v));return v}
function stamp(){return new Date().toISOString()}
function makeId(){return 'L47-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8)}
function resolvePack(){
 if(typeof window.getCurrentDocumentPack==='function') return window.getCurrentDocumentPack();
 if(window.currentDocumentPack) return window.currentDocumentPack;
 return null;
}
function docsOf(pack){return (pack&&pack.documents||[]).map(d=>({documentId:d.documentId||d.id||null,type:d.type||d.documentType||null,contentHash:d.contentHash||null,revisionId:d.revisionId||null}));}
function packId(pack){return pack&&(pack.packId||pack.documentPackId||pack.id);}
function ensure(pack){
 if(!pack) throw new Error('Document Pack tidak ditemukan.');
 const pid=packId(pack); if(!pid) throw new Error('Document Pack ID tidak tersedia.');
 const all=read();
 if(!all[pid]) all[pid]={packId:pid,state:'draft',events:[{eventId:makeId(),type:'created',from:null,to:'draft',at:stamp()}],approvals:[],finalizedAt:null,finalizedSnapshot:docsOf(pack)};
 write(all); return all[pid];
}
function setRec(rec){const all=read();all[rec.packId]=rec;write(all);return rec;}
function transition(pack,to,meta){
 const rec=ensure(pack); if(!STATES.includes(to)) throw new Error('Lifecycle state tidak valid.');
 if(!(TRANSITIONS[rec.state]||[]).includes(to)) throw new Error('Transisi '+rec.state+' → '+to+' tidak diizinkan.');
 const ev={eventId:makeId(),type:'transition',from:rec.state,to,at:stamp(),actor:(meta&&meta.actor)||'local-user',note:(meta&&meta.note)||''};
 rec.events.push(ev);rec.state=to;
 if(to==='final'){rec.finalizedAt=ev.at;rec.finalizedSnapshot=docsOf(pack);}
 return setRec(rec);
}
function approve(pack,meta){
 const rec=ensure(pack);if(rec.state!=='review') throw new Error('Pack harus berada pada status Review sebelum approval.');
 const approval={approvalId:makeId(),approvedAt:stamp(),actor:(meta&&meta.actor)||'local-approver',comment:(meta&&meta.comment)||'',decision:'approved'};
 rec.approvals.push(approval);rec.events.push({eventId:makeId(),type:'approval',at:approval.approvedAt,actor:approval.actor,comment:approval.comment});rec.state='approved';return setRec(rec);
}
function audit(pack){
 const rec=ensure(pack),issues=[],docs=docsOf(pack);
 if(rec.state==='final'||rec.state==='archived'){
  const frozen=new Map((rec.finalizedSnapshot||[]).map(x=>[x.documentId,x.contentHash]));
  docs.forEach(d=>{if(frozen.has(d.documentId)&&frozen.get(d.documentId)!==d.contentHash)issues.push({code:'FINAL_CONTENT_CHANGED',documentId:d.documentId});});
 }
 const types=new Set(docs.map(d=>d.type).filter(Boolean));REQUIRED.forEach(t=>{if(!types.has(t))issues.push({code:'MISSING_DOCUMENT',type:t});});
 return {ok:issues.length===0,packId:rec.packId,state:rec.state,issues,events:rec.events,approvals:rec.approvals,finalizedAt:rec.finalizedAt};
}
function exportManifest(pack){return JSON.stringify(audit(pack),null,2)}
function selfTest(){
 const fake={packId:'SELFTEST-47',documents:REQUIRED.map((type,i)=>({documentId:'D'+i,type,contentHash:'h'+i}))};localStorage.removeItem(KEY);let r=ensure(fake),ok=r.state==='draft';r=transition(fake,'review',{actor:'self-test'});ok=ok&&r.state==='review';r=approve(fake,{actor:'self-test'});ok=ok&&r.state==='approved';r=transition(fake,'final',{actor:'self-test'});ok=ok&&r.state==='final'&&audit(fake).ok;localStorage.removeItem(KEY);return {ok,checks:['draft','review','approval','final','audit']};
}
window.phase47={STATES,TRANSITIONS,REQUIRED,resolvePack,ensure,transition,approve,audit,exportManifest,selfTest};
window.ensureDocumentPackLifecycleV47=ensure;window.transitionDocumentPackV47=transition;window.approveDocumentPackV47=approve;window.auditDocumentPackLifecycleV47=audit;window.exportDocumentPackLifecycleManifestV47=exportManifest;window.runPhase47SelfTest=selfTest;
})();
