(function(){
  'use strict';
  const CATEGORIES={
    meeting:{label:'Rapat & Meeting',tags:['meeting','conference','agenda','collaboration']},
    productivity:{label:'Produktivitas & Workflow',tags:['productivity','workflow','office','task']},
    office:{label:'Perlengkapan Kantor',tags:['office','workspace','stationery','desk']},
    computing:{label:'Komputer & Aksesori',tags:['computer','laptop','keyboard','mouse','monitor']},
    mobile:{label:'Mobile & Gadget',tags:['smartphone','tablet','gadget','mobile']},
    audio:{label:'Audio',tags:['audio','microphone','speaker','headset','recording']},
    video:{label:'Video & Creator',tags:['camera','webcam','lighting','creator','video']},
    presentation:{label:'Presentasi',tags:['presentation','projector','pointer','display']},
    networking:{label:'Jaringan & Connectivity',tags:['wifi','router','network','usb','connectivity']},
    storage:{label:'Storage & Data',tags:['storage','ssd','harddisk','backup','data']},
    software:{label:'Software & Digital Tools',tags:['software','saas','cloud','security','automation']},
    education:{label:'Pendidikan & Pembelajaran',tags:['education','course','learning','books','study']},
    books:{label:'Buku & Referensi',tags:['books','reference','reading','knowledge']},
    writing:{label:'Menulis & Dokumentasi',tags:['writing','documentation','printing','paper']},
    travel:{label:'Perjalanan & Mobilitas',tags:['travel','luggage','transport','navigation']},
    lifestyle:{label:'Lifestyle',tags:['lifestyle','daily','home','hobby']},
    home:{label:'Rumah & Living',tags:['home','kitchen','living','organization']},
    health:{label:'Kebugaran & Wellness',tags:['fitness','wellness','sleep','ergonomic']},
    photography:{label:'Fotografi',tags:['photography','camera','lens','tripod']},
    gaming:{label:'Gaming',tags:['gaming','console','controller','pc']},
    fashion:{label:'Fashion & Personal',tags:['fashion','bags','shoes','accessories']},
    beauty:{label:'Beauty & Care',tags:['care','grooming','beauty']},
    food:{label:'Makanan & Minuman',tags:['food','beverage','coffee','cooking']},
    finance:{label:'Keuangan & Perencanaan',tags:['finance','budget','planning','business']},
    business:{label:'Bisnis & UMKM',tags:['business','entrepreneur','marketing','sales']},
    security:{label:'Keamanan & Privacy',tags:['security','privacy','lock','protection']},
    sustainability:{label:'Sustainability',tags:['eco','reusable','energy','sustainable']}
  };
  const base={enabled:true,adsense:{enabled:false,publisherId:'',slots:{}},affiliate:{enabled:true,network:'Shopee Affiliate',disclosure:'Rekomendasi ini menggunakan tautan afiliasi Shopee. Jika Anda membeli melalui tautan tersebut, pengelola dapat menerima komisi tanpa biaya tambahan bagi Anda.',categories:CATEGORIES,items:[]},premium:{enabled:false,upgradeUrl:'',benefits:[]},privacy:{privacyUrl:'./privacy-policy.html',termsUrl:'./terms.html'}};
  function merge(o){o=o||{};return {...base,...o,adsense:{...base.adsense,...(o.adsense||{})},affiliate:{...base.affiliate,...(o.affiliate||{}),categories:{...CATEGORIES,...(o.affiliate?.categories||{})},items:Array.isArray(o.affiliate?.items)?o.affiliate.items:[]},premium:{...base.premium,...(o.premium||{})},privacy:{...base.privacy,...(o.privacy||{})}}}
  function publish(cfg){window.NOTULENSI_MONETIZATION=Object.freeze(merge(cfg));window.NOTULENSI_MONETIZATION_DEFAULTS=Object.freeze(base);window.dispatchEvent(new CustomEvent('notulensi:monetization-ready'))}
  publish(base);
  window.NOTULENSI_MONETIZATION_READY=fetch('./api/monetization-config',{credentials:'omit',cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject(new Error('monetization-config '+r.status))).then(d=>{publish(d.config);return d.config}).catch(()=>window.NOTULENSI_MONETIZATION);
})();
