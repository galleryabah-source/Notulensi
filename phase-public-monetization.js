(function(){
  'use strict';
  const MODULES={
    intelTab:'meeting-tools',
    dashboardTab:'productivity',
    crossMeetingTab:'audio',
    continuityTab:'meeting-tools',
    knowledgeGraphTab:'productivity',
    reportTab:'audio',
    docsTab:'meeting-tools',
    historyTab:'productivity'
  };
  const DEFAULT={enabled:true,affiliate:{enabled:true,network:'Shopee Affiliate',disclosure:'Rekomendasi ini menggunakan tautan afiliasi Shopee. Jika Anda membeli melalui tautan tersebut, pengelola dapat menerima komisi tanpa biaya tambahan bagi Anda.',items:[]}};
  function publish(cfg){const merged={...DEFAULT,...(cfg||{}),affiliate:{...DEFAULT.affiliate,...((cfg||{}).affiliate||{}),items:Array.isArray(cfg?.affiliate?.items)?cfg.affiliate.items:[]}};window.NOTULENSI_MONETIZATION=Object.freeze(merged);window.dispatchEvent(new CustomEvent('notulensi:monetization-ready'))}
  function loadConfig(){return fetch('./api/monetization-config',{credentials:'omit',cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('monetization-config '+r.status);return r.json()}).then(d=>{publish(d.config);return d.config}).catch(e=>{console.warn('[monetization] public config unavailable',e);publish(DEFAULT);return window.NOTULENSI_MONETIZATION})}
  function getItem(id){const items=window.NOTULENSI_MONETIZATION?.affiliate?.items||[];return items.find(x=>x&&x.id===id&&x.url)||items.find(x=>x&&x.url)||null}
  function openAffiliate(moduleId){const a=window.NOTULENSI_MONETIZATION?.affiliate||{};if(!a.enabled)return null;const item=getItem(MODULES[moduleId]);if(!item)return null;const adUrl=`./api/affiliate-ad?id=${encodeURIComponent(item.id||'')}`;
    const win=window.open(adUrl,'_blank','noopener,noreferrer');
    if(win){try{win.opener=null}catch(_){} return win}
    return null;
  }
  function decorate(){
    Object.keys(MODULES).forEach(id=>{
      const el=document.getElementById(id);if(!el||el.dataset.nmAffiliateBound==='1')return;
      el.dataset.nmAffiliateBound='1';
      el.addEventListener('click',()=>openAffiliate(id),{capture:true});
      el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){openAffiliate(id)}},{capture:true});
    });
  }
  window.NOTULENSI_MONETIZATION_API={refresh:decorate,openAffiliate,isAffiliateOnly:()=>true,renderAffiliateAds:decorate};
  window.NOTULENSI_MONETIZATION_READY=loadConfig();
  window.NOTULENSI_MONETIZATION_READY.finally(()=>{decorate();setTimeout(decorate,100);setTimeout(decorate,1000)});
  window.addEventListener('notulensi:monetization-ready',decorate);
  window.addEventListener('load',()=>setTimeout(decorate,100),{once:true});
  document.addEventListener('DOMContentLoaded',()=>setTimeout(decorate,100),{once:true});
})();
