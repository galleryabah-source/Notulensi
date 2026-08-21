/* PHASE 4.8 — Controlled Publishing & Distribution
 * Additive layer. Does not rewrite meeting history, rawAI, analysis,
 * continuity state, knowledge graph, revision history, or lifecycle history.
 */
(function(global){
  'use strict';
  const STORE_KEY='meetingIntelligence.phase4.8.shares.v1';
  const VALID_POLICIES=['private','unlisted','restricted'];
  const EVENTS=['created','viewed','downloaded','revoked','expired','policy_changed'];
  const now=()=>new Date().toISOString();
  const hash=s=>{let h=2166136261;for(let i=0;i<String(s).length;i++){h^=String(s).charCodeAt(i);h=Math.imul(h,16777619)}return ('00000000'+(h>>>0).toString(16)).slice(-8)};
  function load(){try{return JSON.parse(localStorage.getItem(STORE_KEY)||'[]')}catch{return[]}}
  function save(x){localStorage.setItem(STORE_KEY,JSON.stringify(x));return x}
  function getPack(id){
    const candidates=[global.documentPackStore,global.documentPacks,global.meetingDocumentPacks];
    for(const c of candidates){if(!c)continue;if(Array.isArray(c)){const x=c.find(v=>v&&(v.id===id||v.packId===id));if(x)return x}if(typeof c==='object'&&c[id])return c[id]}
    return null;
  }
  function createShare(packId,options={}){
    const pack=getPack(packId); if(!pack) throw new Error('Document Pack tidak ditemukan');
    const policy=options.policy||'private'; if(!VALID_POLICIES.includes(policy))throw new Error('Policy tidak valid');
    const expiresAt=options.expiresAt||null;
    if(expiresAt && new Date(expiresAt).getTime()<=Date.now())throw new Error('Expiration harus berada di masa depan');
    const share={shareId:'SHR-'+Date.now()+'-'+hash(packId+Math.random()),packId,policy,createdAt:now(),expiresAt,revokedAt:null,createdBy:options.createdBy||'system',events:[]};
    share.events.push({type:'created',at:share.createdAt,actor:share.createdBy}); save(load().concat(share)); return share;
  }
  function findShare(id){return load().find(x=>x.shareId===id)||null}
  function assertAccessible(share){
    if(!share)throw new Error('Share tidak ditemukan');
    if(share.revokedAt)throw new Error('Share sudah dicabut');
    if(share.expiresAt && new Date(share.expiresAt).getTime()<=Date.now()){recordEvent(share.shareId,'expired','system');throw new Error('Share sudah kedaluwarsa')}
    return share;
  }
  function recordEvent(id,type,actor='system',meta={}){
    if(!EVENTS.includes(type))throw new Error('Event tidak valid'); const all=load(),s=all.find(x=>x.shareId===id);if(!s)throw new Error('Share tidak ditemukan');s.events=s.events||[];s.events.push({type,at:now(),actor,meta});save(all);return s;
  }
  function viewShare(id,actor='anonymous'){const s=assertAccessible(findShare(id));recordEvent(id,'viewed',actor);return s}
  function downloadShare(id,actor='anonymous'){const s=assertAccessible(findShare(id));recordEvent(id,'downloaded',actor);return s}
  function revokeShare(id,actor='system'){const s=findShare(id);if(!s)throw new Error('Share tidak ditemukan');if(!s.revokedAt){s.revokedAt=now();s.events=(s.events||[]).concat({type:'revoked',at:s.revokedAt,actor});save(load().map(x=>x.shareId===id?s:x))}return s}
  function changePolicy(id,policy,actor='system'){if(!VALID_POLICIES.includes(policy))throw new Error('Policy tidak valid');const all=load(),s=all.find(x=>x.shareId===id);if(!s)throw new Error('Share tidak ditemukan');const old=s.policy;s.policy=policy;s.events=(s.events||[]).concat({type:'policy_changed',at:now(),actor,meta:{from:old,to:policy}});save(all);return s}
  function auditShare(id){const s=findShare(id);if(!s)return{ok:false,issues:['Share tidak ditemukan']};const issues=[];if(!s.packId)issues.push('packId missing');if(!VALID_POLICIES.includes(s.policy))issues.push('invalid policy');if(s.expiresAt&&Number.isNaN(new Date(s.expiresAt).getTime()))issues.push('invalid expiresAt');if(s.revokedAt&&s.events.every(e=>e.type!=='revoked'))issues.push('revocation event missing');return{ok:issues.length===0,shareId:id,issues,eventCount:(s.events||[]).length,status:s.revokedAt?'revoked':(s.expiresAt&&new Date(s.expiresAt)<=new Date()?'expired':'active')}
  }
  function manifest(id){const s=findShare(id);if(!s)throw new Error('Share tidak ditemukan');return{schemaVersion:'4.8.0',exportedAt:now(),share:{...s,integrityHash:hash(JSON.stringify({...s,integrityHash:undefined}))}}}
  function selfTest(){
    const temp='__phase48_test__';
    const fake=global.documentPackStore;global.documentPackStore=[{id:temp,packId:temp}];
    const created=createShare(temp,{policy:'restricted',createdBy:'self-test'});const viewed=viewShare(created.shareId,'self-test');downloadShare(created.shareId,'self-test');revokeShare(created.shareId,'self-test');const audit=auditShare(created.shareId);const manifestOk=!!manifest(created.shareId).share.integrityHash;
    localStorage.setItem(STORE_KEY,JSON.stringify(load().filter(x=>x.shareId!==created.shareId)));if(fake===undefined)delete global.documentPackStore;else global.documentPackStore=fake;
    return{phase:'4.8',ok:viewed.shareId===created.shareId&&audit.ok&&manifestOk,checks:{create:true,view:true,download:true,revoke:true,audit:audit.ok,manifest:manifestOk}};
  }
  global.ensureControlledPublishingV48=()=>load();
  global.createDocumentPackShareV48=createShare;
  global.viewDocumentPackShareV48=viewShare;
  global.downloadDocumentPackShareV48=downloadShare;
  global.revokeDocumentPackShareV48=revokeShare;
  global.changeDocumentPackSharePolicyV48=changePolicy;
  global.auditDocumentPackShareV48=auditShare;
  global.exportDocumentPackShareManifestV48=manifest;
  global.runPhase48SelfTest=selfTest;
})(window);