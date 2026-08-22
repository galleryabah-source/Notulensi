(function(){'use strict';
const KEY='notulensi_affiliate_interest_v1';
const MAX_HISTORY=30;
const MODULE_CONTEXT={intelTab:['meeting','productivity','software','computing','education'],dashboardTab:['productivity','office','computing','business','finance'],crossMeetingTab:['meeting','collaboration','networking','software'],continuityTab:['business','productivity','office','planning'],knowledgeGraphTab:['knowledge','education','books','software'],reportTab:['writing','documentation','office','printing','business'],docsTab:['writing','documentation','storage','office','software'],historyTab:['storage','documentation','books','productivity']};
function read(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return {}}}
function write(x){try{localStorage.setItem(KEY,JSON.stringify(x))}catch{}}
function profile(){const p=read();return {weights:p.weights||{},history:Array.isArray(p.history)?p.history:[]}}
function score(item,moduleId){const p=profile(), cats=Array.isArray(item.categories)?item.categories:(item.category?[item.category]:[]), tags=Array.isArray(item.tags)?item.tags:[];const ctx=MODULE_CONTEXT[moduleId]||[];let s=Number(item.weight||50);for(const c of cats){s+=ctx.includes(c)?30:0;s+=Math.min(30,Number(p.weights[c]||0))}for(const t of tags)s+=Number(p.weights[t]||0)*0.25;const recent=p.history.filter(h=>h.id===item.id).length;s-=recent*18;return Math.max(0.01,s)}
function choose(items,moduleId){const pool=(items||[]).filter(x=>x&&x.url&&x.enabled!==false);if(!pool.length)return null;const ranked=pool.map(x=>({item:x,score:score(x,moduleId)}));const total=ranked.reduce((a,x)=>a+x.score,0);let r=Math.random()*total;for(const x of ranked){r-=x.score;if(r<=0)return x.item}return ranked[ranked.length-1].item}
function record(item,moduleId,clicked){const p=profile(), weights={...p.weights};const cats=Array.isArray(item.categories)?item.categories:(item.category?[item.category]:[]);cats.forEach(c=>{weights[c]=Math.min(100,Number(weights[c]||0)+(clicked?8:1))});const history=[{id:item.id,moduleId,clicked:Boolean(clicked),ts:Date.now()},...p.history].slice(0,MAX_HISTORY);write({weights,history})}
window.NOTULENSI_AFFILIATE_ENGINE={choose,record,profile,contexts:MODULE_CONTEXT};
})();
