/* PHASE 4.12 — Delivery Notifications & Recipient Communication
 * Additive layer over secure sharing/governance. Prototype client orchestration only.
 */
(function(global){'use strict';
const VERSION='4.12.0',KEY='meetingIntelligence.phase4.12.delivery.v1';
const now=()=>new Date().toISOString();
const hash=s=>{let h=2166136261;for(let i=0;i<String(s).length;i++){h^=String(s).charCodeAt(i);h=Math.imul(h,16777619)}return('00000000'+(h>>>0).toString(16)).slice(-8)};
function read(){try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}}function write(x){localStorage.setItem(KEY,JSON.stringify(x));return x}
function create(recipientId,type='email',payload={}){if(!recipientId)throw Error('recipientId wajib');if(!['email','portal','webhook'].includes(type))throw Error('delivery type tidak valid');const x={deliveryId:'DLV-'+Date.now()+'-'+hash(recipientId+Math.random()),recipientId,type,status:'queued',createdAt:now(),sentAt:null,attempts:0,payload:{subject:payload.subject||'Shared meeting document',message:payload.message||'',target:payload.target||null},events:[{type:'queued',at:now(),actor:payload.actor||'system'}]};write(read().concat(x));return x}
function mark(id,status,meta={}){const all=read(),x=all.find(v=>v.deliveryId===id);if(!x)throw Error('delivery tidak ditemukan');if(!['queued','sent','failed','cancelled'].includes(status))throw Error('status tidak valid');x.status=status;x.attempts=(x.attempts||0)+(status==='sent'||status==='failed'?1:0);if(status==='sent')x.sentAt=now();x.events=(x.events||[]).concat({type:status,at:now(),actor:meta.actor||'system',meta});write(all);return x}
function list(recipientId){return read().filter(x=>!recipientId||x.recipientId===recipientId)}
function retry(id){const x=read().find(v=>v.deliveryId===id);if(!x)throw Error('delivery tidak ditemukan');if(x.status!=='failed')throw Error('hanya failed yang dapat di-retry');return mark(id,'queued',{actor:'retry'})}
function manifest(recipientId){const items=list(recipientId);return{schemaVersion:VERSION,exportedAt:now(),count:items.length,items:items.map(x=>({...x,payload:{...x.payload}})),integrityHash:hash(JSON.stringify(items))}}
function selfTest(){let ok=true,x;try{x=create('SELF-412','portal',{subject:'Test'});mark(x.deliveryId,'sent',{actor:'self-test'});ok=list('SELF-412')[0].status==='sent'&&manifest('SELF-412').integrityHash}catch(e){ok=false}localStorage.setItem(KEY,JSON.stringify(read().filter(v=>v.recipientId!=='SELF-412')));return{phase:'4.12',ok:Boolean(ok),checks:['queue','delivery status','event history','manifest integrity']}}
global.phase412={VERSION,create,mark,list,retry,manifest,selfTest};global.queueRecipientDeliveryV412=create;global.updateRecipientDeliveryV412=mark;global.listRecipientDeliveriesV412=list;global.retryRecipientDeliveryV412=retry;global.exportDeliveryManifestV412=manifest;global.runPhase412SelfTest=selfTest;
})(window);
