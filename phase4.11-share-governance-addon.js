/* PHASE 4.11 — Share Governance & Audit Center
 * Additive governance layer over Phase 4.8–4.10.
 * Client-side prototype only; server-side authorization remains required for production.
 */
(function(global){
  'use strict';
  const VERSION='4.11.0';
  const RECIPIENT_KEY='meetingIntelligence.phase4.9.recipients.v1';
  const SHARE_KEY='meetingIntelligence.phase4.8.shares.v1';
  const PORTAL_KEY='meetingIntelligence.phase4.10.portalAudit.v1';
  const read=(key,fallback=[])=>{try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}catch{return fallback}};
  const now=()=>new Date().toISOString();
  const status=x=>x.revokedAt?'revoked':(x.expiresAt&&new Date(x.expiresAt).getTime()<=Date.now()?'expired':'active');
  function recipients(){return read(RECIPIENT_KEY,[])}
  function shares(){return read(SHARE_KEY,[])}
  function portalEvents(){return read(PORTAL_KEY,[])}
  function summarize(packId){
    const rs=recipients().filter(x=>!packId||shares().some(s=>s.shareId===x.shareId&&s.packId===packId));
    const counts={active:0,expired:0,revoked:0};rs.forEach(x=>counts[status(x)]++);
    const events=portalEvents().filter(e=>!packId||e.shareId&&rs.some(r=>r.shareId===e.shareId));
    const accesses=events.filter(e=>e.type==='portal_opened'||e.type==='portal_preview'||e.type==='portal_download');
    const byRecipient={};accesses.forEach(e=>{byRecipient[e.recipientId]=(byRecipient[e.recipientId]||0)+1});
    const anomalies=[];
    Object.entries(byRecipient).forEach(([recipientId,count])=>{if(count>=10)anomalies.push({code:'HIGH_ACCESS_VOLUME',recipientId,count})});
    rs.filter(x=>status(x)!=='active').forEach(x=>{const recent=events.filter(e=>e.recipientId===x.recipientId);if(recent.length)anomalies.push({code:'EVENT_AFTER_INACTIVE_STATE',recipientId:x.recipientId,status:status(x),events:recent.length})});
    return {version:VERSION,generatedAt:now(),packId:packId||null,totals:{recipients:rs.length,...counts,portalEvents:events.length,accessEvents:accesses.length},byRecipient,anomalies,recipients:rs.map(x=>({recipientId:x.recipientId,shareId:x.shareId,role:x.role,scope:x.scope,status:status(x),expiresAt:x.expiresAt||null,eventCount:(x.events||[]).length}))};
  }
  function revokeAll(packId,actor='governance'){
    const target=recipients().filter(x=>!packId||shares().some(s=>s.shareId===x.shareId&&s.packId===packId));
    const revoked=[];for(const x of target){if(status(x)==='active'&&typeof global.revokeExternalRecipientShareV49==='function'){try{global.revokeExternalRecipientShareV49(x.recipientId,actor);revoked.push(x.recipientId)}catch{}}}
    return {revokedCount:revoked.length,recipientIds:revoked,at:now(),packId:packId||null};
  }
  function exportAudit(packId){return JSON.stringify({schema:'4.11.0',exportedAt:now(),summary:summarize(packId),recipientEvents:recipients().filter(x=>!packId||x.shareId&&shares().some(s=>s.shareId===x.shareId&&s.packId===packId)).map(x=>({recipientId:x.recipientId,shareId:x.shareId,events:x.events||[]})),portalEvents:portalEvents()},null,2)}
  function selfTest(){
    const oldR=localStorage.getItem(RECIPIENT_KEY),oldS=localStorage.getItem(SHARE_KEY),oldP=localStorage.getItem(PORTAL_KEY);
    localStorage.setItem(RECIPIENT_KEY,JSON.stringify([{recipientId:'T411',shareId:'S411',role:'external',scope:'documents',expiresAt:null,revokedAt:null,events:[{type:'created'}]}]));
    localStorage.setItem(SHARE_KEY,JSON.stringify([{shareId:'S411',packId:'P411'}]));localStorage.setItem(PORTAL_KEY,JSON.stringify([{type:'portal_opened',recipientId:'T411',shareId:'S411'}]));
    const s=summarize('P411'),ok=s.totals.recipients===1&&s.totals.accessEvents===1&&Array.isArray(s.anomalies)&&JSON.parse(exportAudit('P411')).schema==='4.11.0';
    oldR===null?localStorage.removeItem(RECIPIENT_KEY):localStorage.setItem(RECIPIENT_KEY,oldR);oldS===null?localStorage.removeItem(SHARE_KEY):localStorage.setItem(SHARE_KEY,oldS);oldP===null?localStorage.removeItem(PORTAL_KEY):localStorage.setItem(PORTAL_KEY,oldP);
    return {phase:'4.11',ok,checks:['recipient summary','access aggregation','anomaly scan','audit export']};
  }
  global.phase411={VERSION,summarize,revokeAll,exportAudit,selfTest};
  global.getShareGovernanceSummaryV411=summarize;global.revokeAllRecipientsV411=revokeAll;global.exportShareGovernanceAuditV411=exportAudit;global.runPhase411SelfTest=selfTest;
})(window);
