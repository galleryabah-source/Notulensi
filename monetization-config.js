(function(){
  'use strict';
  const base={
    enabled:true,
    adsense:{enabled:false,publisherId:'',slots:{}},
    affiliate:{
      enabled:true,
      network:'Shopee Affiliate',
      disclosure:'Rekomendasi ini menggunakan tautan afiliasi Shopee. Jika Anda membeli melalui tautan tersebut, pengelola dapat menerima komisi tanpa biaya tambahan bagi Anda.',
      items:[
        {id:'meeting-tools',title:'Perlengkapan rapat & presentasi',description:'Rekomendasi produk yang relevan untuk rapat, presentasi, dan dokumentasi.',url:'',label:'Lihat di Shopee'},
        {id:'productivity',title:'Perlengkapan produktivitas',description:'Pilihan produk pendukung pekerjaan dan pengelolaan dokumen.',url:'',label:'Lihat di Shopee'},
        {id:'audio',title:'Peralatan audio rapat',description:'Produk pendukung rekaman suara dan transkripsi rapat.',url:'',label:'Lihat di Shopee'}
      ]
    },
    premium:{enabled:false,upgradeUrl:'',benefits:[]},
    privacy:{privacyUrl:'./privacy-policy.html',termsUrl:'./terms.html'}
  };
  function merge(o){o=o||{};return {
    enabled:base.enabled,
    adsense:{...base.adsense,...(o.adsense||{})},
    affiliate:{...base.affiliate,...(o.affiliate||{}),items:Array.isArray(o.affiliate?.items)?o.affiliate.items:base.affiliate.items},
    premium:{...base.premium,...(o.premium||{})},
    privacy:{...base.privacy,...(o.privacy||{})}
  }}
  function publish(cfg){window.NOTULENSI_MONETIZATION=Object.freeze(merge(cfg));window.dispatchEvent(new CustomEvent('notulensi:monetization-ready'))}
  publish(base);
  window.NOTULENSI_MONETIZATION_DEFAULTS=Object.freeze(base);
  window.NOTULENSI_MONETIZATION_READY=fetch('./api/monetization-config',{credentials:'omit',cache:'no-store'})
    .then(r=>r.ok?r.json():Promise.reject(new Error('monetization-config '+r.status)))
    .then(d=>{publish(d.config);return d.config})
    .catch(()=>window.NOTULENSI_MONETIZATION);
})();
