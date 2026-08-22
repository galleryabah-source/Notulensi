(function(){
  'use strict';

  const cfg = window.NOTULENSI_MONETIZATION || {};
  const ADS = cfg.adsense || {};
  const AFF = cfg.affiliate || {};
  const PREMIUM = cfg.premium || {};

  function esc(v){
    return String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  function css(){
    if(document.getElementById('notulensiMonetizationStyle')) return;
    const s=document.createElement('style'); s.id='notulensiMonetizationStyle';
    s.textContent=`
      .nm-ad-slot{margin:18px 0;padding:10px 0;min-height:90px;display:flex;justify-content:center;align-items:center;clear:both}
      .nm-ad-inner{width:min(100%,728px);min-height:90px;border:1px solid rgba(100,116,139,.24);border-radius:10px;background:rgba(15,23,42,.3);display:flex;align-items:center;justify-content:center;overflow:hidden}
      .nm-ad-label{font:10px/1 system-ui,sans-serif;color:#64748b;text-transform:uppercase;letter-spacing:.08em}
      .nm-affiliate{margin:18px 0;padding:14px;border:1px solid rgba(100,116,139,.28);border-radius:12px;background:rgba(15,23,42,.72)}
      .nm-affiliate h4{margin:0;color:#e2e8f0;font:700 13px/1.3 Inter,system-ui,sans-serif}.nm-affiliate p{margin:5px 0 0;color:#94a3b8;font:11px/1.5 Inter,system-ui,sans-serif}
      .nm-affiliate-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:10px}.nm-aff-card{padding:11px;border:1px solid rgba(100,116,139,.25);border-radius:9px;background:#020617}.nm-aff-card b{display:block;color:#cbd5e1;font:600 12px/1.3 Inter,system-ui,sans-serif}.nm-aff-card span{display:block;color:#64748b;font:10px/1.4 Inter,system-ui,sans-serif;margin-top:4px}.nm-aff-card a{display:inline-flex;margin-top:8px;padding:6px 9px;border-radius:7px;border:1px solid #334155;background:#1e293b;color:#dbeafe;text-decoration:none;font:600 10px Inter,system-ui,sans-serif}.nm-aff-card a:hover{background:#334155}
      .nm-premium{margin:18px 0;padding:14px;border:1px solid rgba(59,130,246,.32);border-radius:12px;background:linear-gradient(180deg,rgba(30,58,138,.18),rgba(15,23,42,.72))}.nm-premium b{color:#dbeafe;font:700 13px Inter,sans-serif}.nm-premium ul{margin:8px 0 0;padding-left:18px;color:#94a3b8;font:11px/1.55 Inter,sans-serif}.nm-premium a{display:inline-flex;margin-top:10px;padding:7px 10px;background:#2563eb;color:#fff;text-decoration:none;border-radius:7px;font:700 11px Inter,sans-serif}
      .nm-consent{position:fixed;left:16px;right:16px;bottom:16px;z-index:99999;max-width:760px;margin:auto;padding:14px 16px;border:1px solid #334155;border-radius:14px;background:rgba(2,6,23,.96);box-shadow:0 16px 50px rgba(0,0,0,.4);backdrop-filter:blur(10px)}.nm-consent p{margin:0;color:#cbd5e1;font:11px/1.5 Inter,system-ui,sans-serif}.nm-consent-actions{display:flex;gap:8px;margin-top:10px}.nm-consent button{border:1px solid #475569;border-radius:7px;background:#1e293b;color:#e2e8f0;padding:7px 10px;font:600 10px Inter,sans-serif;cursor:pointer}.nm-consent button.primary{background:#2563eb;border-color:#3b82f6;color:#fff}
      @media(max-width:700px){.nm-affiliate-grid{grid-template-columns:1fr}}
    `; document.head.appendChild(s);
  }

  function loadConsent(){try{return localStorage.getItem('notulensi_ads_consent')||''}catch{return ''}}
  function saveConsent(v){try{localStorage.setItem('notulensi_ads_consent',v)}catch{}}

  function consentBanner(){
    if(!ADS.enabled || loadConsent()) return;
    const box=document.createElement('div'); box.className='nm-consent';
    box.innerHTML=`<p><strong>Privasi & iklan.</strong> Kami dapat menampilkan iklan dan rekomendasi afiliasi untuk membiayai layanan. Anda dapat memilih apakah iklan dipersonalisasi. Lihat <a href="${esc(cfg.privacy?.privacyUrl||'./privacy-policy.html')}" style="color:#93c5fd">Kebijakan Privasi</a>.</p><div class="nm-consent-actions"><button class="primary" type="button" data-c="personalized">Izinkan iklan relevan</button><button type="button" data-c="limited">Gunakan iklan terbatas</button></div>`;
    box.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{saveConsent(b.dataset.c);box.remove();loadAds()}));
    document.body.appendChild(box);
  }

  function loadAds(){
    if(!ADS.enabled || !ADS.publisherId) return;
    if(loadConsent()==='') return;
    if(!document.querySelector('script[data-notulensi-adsense]')){
      const s=document.createElement('script'); s.async=true; s.src='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client='+encodeURIComponent(ADS.publisherId); s.crossOrigin='anonymous'; s.dataset.notulensiAdsense='1'; document.head.appendChild(s);
    }
    document.querySelectorAll('.nm-ad-slot').forEach(slot=>{
      const adSlot=slot.dataset.adSlot||'';
      if(!adSlot || slot.dataset.loaded) return;
      slot.innerHTML=`<div class="nm-ad-inner"><ins class="adsbygoogle" style="display:block" data-ad-client="${esc(ADS.publisherId)}" data-ad-slot="${esc(adSlot)}" data-ad-format="auto" data-full-width-responsive="true"></ins></div>`;
      slot.dataset.loaded='1';
      try{(window.adsbygoogle=window.adsbygoogle||[]).push({})}catch{}
    });
  }

  function adSlot(key, parent){
    const slot=ADS.slots?.[key]||'';
    if(!ADS.enabled || !slot || !parent || parent.querySelector(`.nm-ad-slot[data-key="${key}"]`)) return;
    const wrap=document.createElement('div'); wrap.className='nm-ad-slot'; wrap.dataset.key=key; wrap.dataset.adSlot=slot; wrap.setAttribute('aria-label','Iklan');
    wrap.innerHTML='<div class="nm-ad-inner"><span class="nm-ad-label">Ruang iklan</span></div>';
    parent.appendChild(wrap);
  }

  function affiliateBlock(parent){
    if(!AFF.enabled || !parent || parent.querySelector('#nmAffiliateBlock')) return;
    const items=(AFF.items||[]).filter(x=>x&&x.url);
    if(!items.length) return;
    const box=document.createElement('section'); box.id='nmAffiliateBlock'; box.className='nm-affiliate';
    box.innerHTML=`<h4>Rekomendasi yang relevan</h4><p>${esc(AFF.disclosure||'Tautan afiliasi dapat memberi komisi kepada pengelola.')}</p><div class="nm-affiliate-grid">${items.map(x=>`<div class="nm-aff-card"><b>${esc(x.title)}</b><span>${esc(x.description)}</span><a href="${esc(x.url)}" target="_blank" rel="nofollow sponsored noopener">${esc(x.label||'Lihat')}</a></div>`).join('')}</div>`;
    parent.appendChild(box);
  }

  function premiumBlock(parent){
    if(!PREMIUM.enabled||!parent||parent.querySelector('#nmPremiumBlock')) return;
    const box=document.createElement('section');box.id='nmPremiumBlock';box.className='nm-premium';
    box.innerHTML=`<b>⭐ Notulensi Pro</b><ul>${(PREMIUM.benefits||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul>${PREMIUM.upgradeUrl?`<a href="${esc(PREMIUM.upgradeUrl)}" rel="noopener">Lihat Paket Pro</a>`:''}`;
    parent.appendChild(box);
  }

  function decorate(){
    css();
    const map=[['dashboardTab','dashboardTop'],['reportTab','reportBottom'],['docsTab','docsBottom'],['historyTab','historyBottom']];
    map.forEach(([id,key])=>{const el=document.getElementById(id); if(el) adSlot(key,el)});
    affiliateBlock(document.getElementById('dashboardTab'));
    premiumBlock(document.getElementById('dashboardTab'));
    consentBanner();
    loadAds();
  }

  window.NOTULENSI_MONETIZATION_API={refresh:decorate,clearConsent:function(){saveConsent('');location.reload()}};
  window.addEventListener('load',()=>setTimeout(decorate,30),{once:true});
  document.addEventListener('DOMContentLoaded',()=>setTimeout(decorate,30),{once:true});
})();
