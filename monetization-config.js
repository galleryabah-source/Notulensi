(function(){
  'use strict';
  window.NOTULENSI_MONETIZATION = Object.freeze({
    enabled: true,
    adsense: { enabled: false, publisherId: '', slots: {} },
    affiliate: {
      enabled: true,
      network: 'Shopee Affiliate',
      disclosure: 'Rekomendasi ini menggunakan tautan afiliasi Shopee. Jika Anda membeli melalui tautan tersebut, pengelola dapat menerima komisi tanpa biaya tambahan bagi Anda.',
      items: [
        {id:'meeting-tools',title:'Perlengkapan rapat & presentasi',description:'Rekomendasi produk yang relevan untuk rapat, presentasi, dan dokumentasi.',url:'',label:'Lihat di Shopee'},
        {id:'productivity',title:'Perlengkapan produktivitas',description:'Pilihan produk pendukung pekerjaan dan pengelolaan dokumen.',url:'',label:'Lihat di Shopee'},
        {id:'audio',title:'Peralatan audio rapat',description:'Produk pendukung rekaman suara dan transkripsi rapat.',url:'',label:'Lihat di Shopee'}
      ]
    },
    premium: { enabled: false, upgradeUrl: '', benefits: [] },
    privacy: { privacyUrl: './privacy-policy.html', termsUrl: './terms.html' }
  });
})();
