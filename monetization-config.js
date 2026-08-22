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
  function read(){try{return JSON.parse(localStorage.getItem('notulensi_monetization_overrides_v1')||'null')}catch{return null}}
  function merge(){const o=read()||{};const a=o.affiliate||{};const p=o.privacy||{};return {
    enabled:base.enabled,
    adsense:base.adsense,
    affiliate:{...base.affiliate,...a,items:Array.isArray(a.items)?a.items:base.affiliate.items},
    premium:base.premium,
    privacy:{...base.privacy,...p}
  }}
  window.NOTULENSI_MONETIZATION=Object.freeze(merge());
  window.NOTULENSI_MONETIZATION_DEFAULTS=Object.freeze(base);
})();
