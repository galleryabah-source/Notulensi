(function(){
  'use strict';
  window.NOTULENSI_MONETIZATION = Object.freeze({
    enabled: true,
    adsense: {
      enabled: true,
      publisherId: '',
      slots: {
        dashboardTop: '',
        reportBottom: '',
        docsBottom: '',
        historyBottom: ''
      }
    },
    affiliate: {
      enabled: true,
      disclosure: 'Tautan afiliasi dapat memberi komisi kepada pengelola tanpa biaya tambahan bagi Anda.',
      items: [
        {id:'meeting-tools',title:'Perlengkapan rapat & presentasi',description:'Rekomendasi produk yang relevan dengan pekerjaan rapat.',url:'',label:'Lihat rekomendasi'},
        {id:'productivity',title:'Tools produktivitas',description:'Pilihan tools untuk membantu pengelolaan rapat dan dokumen.',url:'',label:'Lihat rekomendasi'}
      ]
    },
    premium: {
      enabled: true,
      upgradeUrl: '',
      benefits: ['Tanpa iklan','Kuota AI lebih tinggi','Ekspor lanjutan','Workspace organisasi']
    },
    privacy: {
      privacyUrl: './privacy-policy.html',
      termsUrl: './terms.html'
    }
  });
})();
