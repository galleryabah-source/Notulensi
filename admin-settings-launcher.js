(function(){
  'use strict';
  function mount(){
    if(document.getElementById('notulensiAdminLauncher'))return;
    fetch('./api/admin-session',{credentials:'include',cache:'no-store'}).then(r=>r.ok?r.json():null).then(s=>{if(!s||!s.authenticated)return;
      const b=document.createElement('button');b.id='notulensiAdminLauncher';b.type='button';b.textContent='⚙️ Pengaturan Admin';
      Object.assign(b.style,{position:'fixed',left:'14px',bottom:'58px',zIndex:'10000',border:'1px solid #334155',borderRadius:'10px',background:'#0f172a',color:'#e2e8f0',padding:'9px 12px',font:'700 11px system-ui,sans-serif',cursor:'pointer',boxShadow:'0 8px 24px rgba(0,0,0,.28)'});
      b.onmouseenter=()=>b.style.background='#1e293b';b.onmouseleave=()=>b.style.background='#0f172a';
      const panel=document.createElement('div');panel.id='notulensiAdminPanel';
      Object.assign(panel.style,{position:'fixed',inset:'0',zIndex:'10001',display:'none',background:'rgba(2,6,23,.82)',backdropFilter:'blur(5px)'});
      panel.innerHTML='<button id="notulensiAdminClose" type="button" style="position:absolute;right:4.8%;top:3%;z-index:2;border:1px solid #475569;border-radius:10px;background:#0f172a;color:#e2e8f0;padding:8px 11px;cursor:pointer">Tutup ✕</button><iframe title="Pengaturan Admin" src="./admin-settings.html" style="position:absolute;inset:4%;width:92%;height:92%;border:1px solid #334155;border-radius:18px;background:#020617;box-shadow:0 24px 80px rgba(0,0,0,.55)"></iframe>';
      document.body.appendChild(panel);document.body.appendChild(b);
      const frame=panel.querySelector('iframe');
      frame.addEventListener('load',()=>{
        try{const doc=frame.contentDocument;const script=doc.createElement('script');script.src='./admin-settings-server-sync.js';doc.body.appendChild(script)}catch{}
      });
      b.onclick=()=>{panel.style.display='block'};panel.querySelector('#notulensiAdminClose').onclick=()=>{panel.style.display='none'};panel.addEventListener('click',e=>{if(e.target===panel)panel.style.display='none'});
    }).catch(()=>{});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
