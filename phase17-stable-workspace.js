/* Phase 17 — stable public workspace + server AI runtime hardening.
 * Keeps meeting controls visible while modules change and prevents legacy
 * browser-AI paths from breaking intelligence/report generation.
 */
(function(){
  'use strict';
  const STYLE_ID='phase17StableWorkspaceStyle';
  const DOCK_ID='phase17MeetingDock';

  function css(){
    if(document.getElementById(STYLE_ID)) return;
    const s=document.createElement('style'); s.id=STYLE_ID;
    s.textContent=`
      html,body{width:100%!important;max-width:100%!important;overflow-x:hidden!important;box-sizing:border-box!important}
      *,*::before,*::after{box-sizing:border-box!important}
      body{min-width:0!important}
      main{width:min(100%,1280px)!important;max-width:1280px!important;min-width:0!important;margin-left:auto!important;margin-right:auto!important;overflow-x:hidden!important}
      main>section{min-width:0!important;max-width:100%!important;overflow:visible!important}
      .mi-module-nav{width:100%!important;max-width:100%!important;min-width:0!important}
      #phase17MeetingDock{position:fixed!important;left:12px!important;right:12px!important;bottom:12px!important;z-index:9998!important;width:auto!important;max-width:1280px!important;margin:0 auto!important;padding:10px!important;background:rgba(15,23,42,.97)!important;border:1px solid rgba(99,102,241,.55)!important;border-radius:14px!important;box-shadow:0 18px 50px rgba(0,0,0,.45)!important;backdrop-filter:blur(12px)!important}
      #phase17MeetingDock .phase17-dock-grid{display:grid!important;grid-template-columns:minmax(130px,1fr) minmax(180px,1.4fr) minmax(150px,1fr) minmax(150px,1fr)!important;gap:8px!important;align-items:center!important}
      #phase17MeetingDock button,#phase17MeetingDock select{min-width:0!important;width:100%!important}
      @media(max-width:800px){#phase17MeetingDock .phase17-dock-grid{grid-template-columns:1fr 1fr!important}}
      @media(max-width:520px){#phase17MeetingDock{left:6px!important;right:6px!important;bottom:6px!important}#phase17MeetingDock .phase17-dock-grid{grid-template-columns:1fr!important}}
      body{padding-bottom:92px!important}
    `;
    document.head.appendChild(s);
  }

  function findButton(patterns){
    return Array.from(document.querySelectorAll('button')).find(b=>patterns.some(p=>p.test((b.textContent||'').trim())||p.test(b.getAttribute('onclick')||'')));
  }

  function makeDock(){
    if(document.getElementById(DOCK_ID)) return;
    const title=document.getElementById('meetingTitle');
    const date=document.getElementById('meetingDate');
    const time=document.getElementById('meetingTime');
    const lang=document.getElementById('meetingLanguage') || document.getElementById('transcriptLanguage');
    const record=findButton([/rekam rapat/i,/mulai rekam/i,/start recording/i,/toggleRecording/i]);
    const upload=findButton([/upload audio/i,/audio/i,/handleAudioUpload/i]);
    const transcribe=findButton([/mulai transkrip/i,/mulai transkripsi/i,/transkrip/i,/start transcription/i]);
    if(!record&&!upload&&!transcribe) return;

    const dock=document.createElement('section'); dock.id=DOCK_ID;
    dock.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:7px"><strong style="font:700 12px Inter,system-ui,sans-serif;color:#e2e8f0">🔒 KONTROL RAPAT</strong><span style="font:10px Inter,system-ui,sans-serif;color:#94a3b8">Kontrol tetap terlihat saat berpindah modul</span></div><div class="phase17-dock-grid"><div class="phase17-dock-meta"></div><div class="phase17-dock-record"></div><div class="phase17-dock-upload"></div><div class="phase17-dock-transcribe"></div></div>`;
    document.body.appendChild(dock);

    const meta=dock.querySelector('.phase17-dock-meta');
    meta.innerHTML=`<div style="font:10px Inter,system-ui,sans-serif;color:#94a3b8">Rapat aktif</div><div style="font:600 11px Inter,system-ui,sans-serif;color:#e2e8f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${String(title?.value||'Meeting Intelligence').replace(/[<>]/g,'')}</div>`;
    if(lang) meta.insertAdjacentHTML('beforeend',`<div style="font:10px Inter,system-ui,sans-serif;color:#64748b;margin-top:3px">Bahasa: ${String(lang.value||'Indonesia').replace(/[<>]/g,'')}</div>`);

    function mirrorButton(original,host){
      if(!original)return;
      const b=document.createElement('button'); b.type='button'; b.className=original.className||'px-3 py-2 rounded-lg bg-slate-800 text-slate-100';
      b.style.cssText='min-height:42px!important;border:1px solid #334155!important;border-radius:10px!important;font:600 12px Inter,system-ui,sans-serif!important;cursor:pointer!important;';
      b.textContent=(original.textContent||'').trim()||'Aksi';
      b.addEventListener('click',()=>original.click()); host.appendChild(b);
      const sync=()=>{b.textContent=(original.textContent||'').trim()||'Aksi';b.disabled=original.disabled;b.style.opacity=original.disabled?.55:1};
      new MutationObserver(sync).observe(original,{childList:true,subtree:true,attributes:true});
      sync();
    }
    mirrorButton(record,dock.querySelector('.phase17-dock-record'));
    mirrorButton(upload,dock.querySelector('.phase17-dock-upload'));
    mirrorButton(transcribe,dock.querySelector('.phase17-dock-transcribe'));
    const syncMeta=()=>{const t=title?.value||'Meeting Intelligence';const el=meta.querySelector('div:nth-child(2)');if(el)el.textContent=t};
    title?.addEventListener('input',syncMeta); date?.addEventListener('change',syncMeta); time?.addEventListener('change',syncMeta);
  }

  async function serverAI(prompt, schema){
    const response=await fetch('./api/ai-runtime',{method:'POST',headers:{'content-type':'application/json'},credentials:'include',cache:'no-store',body:JSON.stringify({prompt,provider:'gemini'})});
    const data=await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(data.error||'AI runtime gagal.');
    const text=String(data.text||'').trim();
    if(!text) throw new Error('Respons AI kosong.');
    if(!schema)return text;
    try{return JSON.parse(text)}catch(e){
      const cleaned=text.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim();
      return JSON.parse(cleaned);
    }
  }

  function installAI(){
    window.phase17ServerAI=serverAI;
    window.callGemini=serverAI;
    try{callGemini=serverAI}catch(e){}
    window.getConfiguredGeminiProvider=async function(){
      try{const r=await fetch('./api/ai-runtime',{cache:'no-store'});const d=await r.json();return {key:'__SERVER_MANAGED_AI__',model:d.model||null,healthy:Boolean(d.healthy)}}catch(e){return {key:'__SERVER_MANAGED_AI__',model:null,healthy:false}}
    };
  }

  function apply(){
    css();
    installAI();
    makeDock();
    try{window.NOTULENSI_MONETIZATION_API?.refresh?.()}catch(e){}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(apply,250),{once:true});else setTimeout(apply,250);
  window.addEventListener('load',()=>setTimeout(apply,250),{once:true});
  setTimeout(apply,1000); setTimeout(apply,2500);
  new MutationObserver(()=>{clearTimeout(window.__phase17StableTimer);window.__phase17StableTimer=setTimeout(apply,120)}).observe(document.documentElement,{childList:true,subtree:true});
})();
