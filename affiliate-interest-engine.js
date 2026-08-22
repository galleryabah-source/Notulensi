(function(){'use strict';
const KEY='notulensi_affiliate_interest_v2';
const MAX_HISTORY=60;
const MAX_WEIGHT=100;
const MODULE_CONTEXT={
 intelTab:['meeting','productivity','software','computing','education','business','office','writing'],
 dashboardTab:['productivity','office','computing','business','finance','analytics','software','home'],
 crossMeetingTab:['meeting','collaboration','networking','software','travel','communication'],
 continuityTab:['business','productivity','office','planning','finance','health'],
 knowledgeGraphTab:['knowledge','education','books','software','research','language','science'],
 reportTab:['writing','documentation','office','printing','business','design','education'],
 docsTab:['writing','documentation','storage','office','software','security','productivity'],
 historyTab:['storage','documentation','books','productivity','photography','organization']
};
const TAXONOMY={
 meeting:['meeting','presentation','collaboration','communication','office'],
 productivity:['productivity','workflow','organization','planning','time-management'],
 office:['office','stationery','printing','ergonomics','workspace'],
 computing:['computing','laptop','desktop','monitor','keyboard','mouse','hardware'],
 mobile:['mobile','smartphone','tablet','wearable','powerbank','mobile-accessories'],
 software:['software','saas','automation','ai-tools','cloud','developer-tools'],
 audio:['audio','microphone','headset','speaker','recording','music'],
 video:['video','camera','webcam','creator','streaming','lighting'],
 presentation:['presentation','projector','presenter','visualization','design'],
 networking:['networking','router','wifi','connectivity','cables','usb'],
 storage:['storage','ssd','hdd','backup','cloud-storage','data'],
 education:['education','learning','course','training','school','study'],
 books:['books','reference','reading','ebook','publishing'],
 writing:['writing','notetaking','journaling','editing','language','translation'],
 documentation:['documentation','pdf','scanning','printing','filing','archive'],
 travel:['travel','luggage','mobility','automotive','commuting','outdoor'],
 lifestyle:['lifestyle','daily-life','organization','hobby','leisure'],
 home:['home','kitchen','cleaning','furniture','decor','smart-home'],
 health:['health','fitness','wellness','sports','sleep','personal-care'],
 photography:['photography','camera','lens','tripod','editing','printing'],
 gaming:['gaming','console','pc-gaming','controller','esports'],
 fashion:['fashion','clothing','shoes','bags','accessories'],
 beauty:['beauty','skincare','haircare','grooming','personal-care'],
 food:['food','beverage','coffee','kitchen','cooking','snacks'],
 finance:['finance','budgeting','accounting','investment','business-tools'],
 business:['business','entrepreneurship','umkm','marketing','sales','commerce'],
 security:['security','privacy','passwords','network-security','backup'],
 sustainability:['sustainability','reusable','energy-saving','eco-friendly'],
 family:['family','parenting','household','children'],
 pets:['pets','pet-care','pet-supplies'],
 automotive:['automotive','car','motorcycle','accessories','maintenance'],
 hobbies:['hobbies','craft','diy','music','art','collecting'],
 science:['science','research','laboratory','engineering'],
 language:['language','translation','dictionary','writing','learning'],
 design:['design','graphics','ui-ux','creative','templates'],
 marketing:['marketing','advertising','social-media','seo','content'],
 photography_print:['photo-printing','albums','frames','ink','paper']
};
function read(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return {}}}
function write(x){try{localStorage.setItem(KEY,JSON.stringify(x))}catch{}}
function profile(){const p=read();return {weights:p.weights&&typeof p.weights==='object'?p.weights:{},history:Array.isArray(p.history)?p.history:[]}}
function normalize(item){const cats=[...(Array.isArray(item?.categories)?item.categories:[]),...(item?.category?[item.category]:[]),...(Array.isArray(item?.tags)?item.tags:[])].map(x=>String(x).toLowerCase().trim()).filter(Boolean);return [...new Set(cats)]}
function related(category){return TAXONOMY[category]||[category]}
function score(item,moduleId){const p=profile(),cats=normalize(item),ctx=MODULE_CONTEXT[moduleId]||[];let s=Math.max(.01,Number(item.weight||50));for(const c of cats){if(ctx.includes(c))s+=45; s+=Math.min(40,Number(p.weights[c]||0));for(const root of Object.keys(TAXONOMY)){if(TAXONOMY[root].includes(c)&&ctx.includes(root))s+=12}}
for(const t of cats)s+=Math.min(15,Number(p.weights[t]||0)*.25);const recent=p.history.filter(h=>h.id===item.id);s-=recent.length*16;if(recent[0]&&Date.now()-recent[0].ts<86400000)s-=12;return Math.max(.01,s)}
function choose(items,moduleId){const pool=(items||[]).filter(x=>x&&x.url&&x.enabled!==false);if(!pool.length)return null;const ranked=pool.map(item=>({item,score:score(item,moduleId)}));const total=ranked.reduce((a,x)=>a+x.score,0);let r=Math.random()*total;for(const x of ranked){r-=x.score;if(r<=0)return x.item}return ranked[ranked.length-1].item}
function record(item,moduleId,clicked){if(!item)return;const p=profile(),weights={...p.weights};const cats=normalize(item);cats.forEach(c=>{weights[c]=Math.min(MAX_WEIGHT,Number(weights[c]||0)+(clicked?8:1));});const history=[{id:item.id,moduleId,clicked:Boolean(clicked),categories:cats,ts:Date.now()},...p.history].slice(0,MAX_HISTORY);write({weights,history,version:2})}
function decay(){const p=profile(),age=Date.now();const weights={};for(const [k,v] of Object.entries(p.weights)){const n=Number(v)||0;weights[k]=Math.max(0,Math.min(MAX_WEIGHT,n*(.995)))}write({weights,history:p.history,version:2})}
window.NOTULENSI_AFFILIATE_ENGINE={choose,record,profile,contexts:MODULE_CONTEXT,taxonomy:TAXONOMY,related,decay};
setInterval(decay,86400000);
})();
