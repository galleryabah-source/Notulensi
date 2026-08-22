(function(){
  'use strict';

  function esc(v){return String(v ?? '').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function css(){
    if(document.getElementById('notulensiAffiliateStyle'))return;
    const s=document.createElement('style');s.id='notulensiAffiliateStyle';s.textContent=`
      .nm-affiliate{margin:16px 0;padding:14px;border:1px solid rgba(100,116,139,.28);border-radius:12px;background:rgba(15,23,42,.76)}
      .nm-affiliate h4{margin:0;color:#e2e8f0;font:700 13px/1.3 Inter,system-ui,sans-serif}
      .nm-affiliate p{margin:5px 0 0;color:#94a3b8;font:11px/1.5 Inter,system-ui,sans-serif}
      .nm-affiliate-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:10px}
      .nm-aff-card{padding:11px;border:1px solid rgba(100,116,139,.25);border-radius:9px;background:#020617}
      .nm-aff-card b{display:block;color:#cbd5e1;font:600 12px/1.3 Inter,system-ui,sans-serif}
      .nm-aff-card span{display:block;color:#64748b;font:10px/1.4 Inter,system-ui,sans-serif;margin-top:4px}
      .nm-aff-card a{display:inline-flex;margin-top:8px;padding:7px 10px;border-radius:7px;border:1px solid #334155;background:#1e293b;color:#dbeafe;text-decoration:none;font:600 10px Inter,system-ui,sans-serif}
      .nm-aff-card a:hover{background:#334155}
      .nm-aff-tag{display:inline-flex;margin-top:8px;padding:3px 6px;border:1px solid rgba(96,165,250,.25);border-radius:5px;color:#93c5fd;font:700 9px system-ui,sans-serif;letter-spacing:.03em}
      @media(max-width:900px){.nm-affiliate-grid{grid-template-columns:1fr 1fr}}@media(max-width:560px){.nm-affiliate-grid{grid-template-columns:1fr}}
    `;document.head.appendChild(s);
  }
  const ADVANCED_MODULES=['intelTab','dashboardTab','crossMeetingTab','continuityTab','knowledgeGraphTab','reportTab','docsTab','historyTab'];
  function getItems(){const aff=window.NOTULENSI_MONETIZATION?.affiliate||{};return (aff.items||[]).filter(x=>x&&x.url).slice(0,3)}
  function affiliateBlock(parent){
    const aff=window.NOTULENSI_MONETIZATION?.affiliate||{};
    if(!aff.enabled||!parent||parent.querySelector(':scope > #nmAffiliateBlock'))return;
    const items=getItems();if(!items.length)return;
    const box=document.createElement('section');box.id='nmAffiliateBlock';box.className='nm-affiliate';
    box.innerHTML=`<h4>🛍️ Rekomendasi pendukung fitur ini</h4><p>${esc(aff.disclosure||'Rekomendasi afiliasi.')}</p><span class="nm-aff-tag">SHOPEE AFFILIATE</span><div class="nm-affiliate-grid"></div>`;
    const grid=box.querySelector('.nm-affiliate-grid');items.forEach(x=>{const card=document.createElement('div');card.className='nm-aff-card';card.innerHTML=`<b>${esc(x.title)}</b><span>${esc(x.description)}</span><a href="${esc(x.url)}" target="_blank" rel="nofollow sponsored noopener" data-affiliate-id="${esc(x.id)}">${esc(x.label||'Lihat di Shopee')}</a>`;grid.appendChild(card)});parent.appendChild(box);
  }
  function decorateAdvancedModules(){css();ADVANCED_MODULES.forEach(id=>affiliateBlock(document.getElementById(id)));}
  window.NOTULENSI_MONETIZATION_API={refresh:decorateAdvancedModules,isAffiliateOnly:()=>true};
  const ready=window.NOTULENSI_MONETIZATION_READY||Promise.resolve();
  ready.finally(()=>{decorateAdvancedModules();setTimeout(decorateAdvancedModules,50)});
  window.addEventListener('notulensi:monetization-ready',decorateAdvancedModules);
  window.addEventListener('load',()=>setTimeout(decorateAdvancedModules,50),{once:true});
  document.addEventListener('DOMContentLoaded',()=>setTimeout(decorateAdvancedModules,50),{once:true});
})();
