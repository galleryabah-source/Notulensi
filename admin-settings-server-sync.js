(function(){
  'use strict';
  const MONO='notulensi_monetization_overrides_v1';
  const SYNC='notulensi_admin_server_sync_v1';
  const defaults={enabled:true,adsense:{enabled:false,publisherId:'',slots:{}},affiliate:{enabled:true,network:'Shopee Affiliate',disclosure:'Rekomendasi ini menggunakan tautan afiliasi Shopee. Jika Anda membeli melalui tautan tersebut, pengelola dapat menerima komisi tanpa biaya tambahan bagi Anda.',items:[{id:'meeting-tools',title:'Perlengkapan rapat & presentasi',description:'Rekomendasi produk yang relevan untuk rapat, presentasi, dan dokumentasi.',url:'',label:'Lihat di Shopee'},{id:'productivity',title:'Perlengkapan produktivitas',description:'Pilihan produk pendukung pekerjaan dan pengelolaan dokumen.',url:'',label:'Lihat di Shopee'},{id:'audio',title:'Peralatan audio rapat',description:'Produk pendukung rekaman suara dan transkripsi rapat.',url:'',label:'Lihat di Shopee'}]},premium:{enabled:false,upgradeUrl:'',benefits:[]},privacy:{privacyUrl:'./privacy-policy.html',termsUrl:'./terms.html'}};
  async function get(){const r=await fetch('./api/monetization-config',{credentials:'include',cache:'no-store'});if(!r.ok)throw new Error('Gagal membaca konfigurasi server.');return r.json()}
  async function put(config){const r=await fetch('./api/monetization-config',{method:'PUT',headers:{'content-type':'application/json'},credentials:'include',body:JSON.stringify({config})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Gagal menyimpan konfigurasi server.');return d}
  function setLocal(config){localStorage.setItem(MONO,JSON.stringify(config))}
  function readLocal(){try{return JSON.parse(localStorage.getItem(MONO)||'null')||defaults}catch{return defaults}}
  async function bootstrap(){
    try{
      const d=await get();
      setLocal(d.config);
      if(sessionStorage.getItem(SYNC)!=='ready'){
        sessionStorage.setItem(SYNC,'ready');
        location.reload();
      }
    }catch(e){
      const s=document.getElementById('affStatus');if(s)s.textContent='⚠️ '+e.message;
    }
  }
  async function save(){
    try{const d=await put(readLocal());const s=document.getElementById('affStatus');if(s)s.textContent='✅ Tersimpan global di server. Semua pengguna akan membaca konfigurasi ini.';setLocal(d.config)}
    catch(e){const s=document.getElementById('affStatus');if(s)s.textContent='❌ '+e.message}
  }
  async function reset(){try{await put(defaults);setLocal(defaults);const s=document.getElementById('affStatus');if(s)s.textContent='✅ Default server dipulihkan.'}catch(e){const s=document.getElementById('affStatus');if(s)s.textContent='❌ '+e.message}}
  document.addEventListener('DOMContentLoaded',()=>{
    bootstrap();
    document.getElementById('saveAff')?.addEventListener('click',()=>setTimeout(save,0));
    document.getElementById('resetAff')?.addEventListener('click',()=>setTimeout(reset,0));
  },{once:true});
})();
