(function(){
  'use strict';
  const NAV=['tabTranscriptBtn','tabIntelBtn','tabDashboardBtn','tabCrossBtn','tabContinuityBtn','tabGraphBtn','tabReportBtn','tabDocsBtn','tabHistoryBtn'];
  const LABELS={
    tabTranscriptBtn:'🎙️ Transkrip',
    tabIntelBtn:'🧠 Intelligence',
    tabDashboardBtn:'📊 Dashboard',
    tabCrossBtn:'🔗 Cross-Meeting',
    tabContinuityBtn:'🎯 Tindak Lanjut',
    tabGraphBtn:'🕸️ Knowledge',
    tabReportBtn:'📑 Laporan',
    tabDocsBtn:'📄 Dokumen & Revisi',
    tabHistoryBtn:'🕘 Riwayat'
  };
  function findActionsCard(){
    const headings=[...document.querySelectorAll('h3')];
    const heading=headings.find(el=>/Intelligence Actions/i.test((el.textContent||'').trim()));
    if(!heading) return null;
    let node=heading;
    while(node && node!==document.body){
      if(node.classList && node.classList.contains('bg-slate-900') && node.querySelector('button[onclick*="runAITask"]')) return node;
      node=node.parentElement;
    }
    return heading.parentElement;
  }
  function ensureActionsWorkspace(nav){
    if(document.getElementById('actionsTab')) return;
    const host=nav.parentElement;
    if(!host) return;
    const tab=document.createElement('div');
    tab.id='actionsTab';
    tab.className='hidden space-y-4';
    tab.setAttribute('role','tabpanel');
    tab.setAttribute('aria-label','Intelligence Actions');
    const intro=document.createElement('div');
    intro.className='bg-slate-900 border border-indigo-500/30 rounded-2xl p-5';
    intro.innerHTML='<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3"><div><h2 class="text-lg font-semibold">⚡ Intelligence Actions</h2><p class="text-xs text-slate-400 mt-1">Jalankan fungsi intelligence dari satu workspace. Semua aksi memakai transkrip aktif dan hasil analisis yang sama.</p></div><span id="actionsRuntimeStatus" class="px-3 py-1 rounded-full text-[11px] bg-slate-800 text-slate-400">Siap</span></div>';
    tab.appendChild(intro);
    const card=findActionsCard();
    if(card){
      card.classList.add('mi-actions-moved');
      card.style.marginTop='0';
      tab.appendChild(card);
    }else{
      const empty=document.createElement('div');
      empty.className='bg-slate-900 border border-slate-800 rounded-2xl p-5 text-sm text-slate-400';
      empty.textContent='Intelligence Actions belum tersedia pada runtime ini.';
      tab.appendChild(empty);
    }
    host.appendChild(tab);
    const btn=document.createElement('button');
    btn.id='tabActionsBtn';
    btn.type='button';
    btn.className='pb-3 border-b-2 border-transparent text-slate-400 whitespace-nowrap';
    btn.textContent='⚡ Intelligence Actions';
    btn.setAttribute('aria-controls','actionsTab');
    btn.onclick=()=>window.switchTab('actionsTab');
    nav.appendChild(btn);
    const originalSwitch=window.switchTab;
    if(typeof originalSwitch==='function' && !originalSwitch.__miActionsWrapped){
      const wrapped=function(tabId){
        const actions=document.getElementById('actionsTab');
        const actionBtn=document.getElementById('tabActionsBtn');
        if(tabId!=='actionsTab' && actions) actions.classList.add('hidden');
        if(actionBtn) actionBtn.classList.remove('border-indigo-500','text-indigo-400');
        if(actionBtn) actionBtn.classList.add('border-transparent','text-slate-400');
        if(tabId==='actionsTab'){
          ['transcriptTab','intelTab','dashboardTab','crossMeetingTab','continuityTab','knowledgeGraphTab','reportTab','docsTab','historyTab'].forEach(id=>document.getElementById(id)?.classList.add('hidden'));
          NAV.forEach(id=>document.getElementById(id)?.classList.remove('border-indigo-500','text-indigo-400'));
          NAV.forEach(id=>document.getElementById(id)?.classList.add('border-transparent','text-slate-400'));
          actions?.classList.remove('hidden');
          actionBtn?.classList.remove('border-transparent','text-slate-400');
          actionBtn?.classList.add('border-indigo-500','text-indigo-400');
          document.getElementById('actionsRuntimeStatus')?.replaceChildren(document.createTextNode('Workspace aktif'));
          return;
        }
        return originalSwitch.call(this,tabId);
      };
      wrapped.__miActionsWrapped=true;
      window.switchTab=wrapped;
    }
    const runButtons=[...tab.querySelectorAll('button[onclick*="runAITask"]')];
    runButtons.forEach(b=>b.addEventListener('click',()=>{
      const status=document.getElementById('actionsRuntimeStatus');
      if(status){status.textContent='AI memproses…';setTimeout(()=>{if(!window.isAIProcessing)status.textContent='Siap'},250)}
    }));
  }
  function apply(){
    if(document.getElementById('miWin11NavStyleV2')) return;
    const first=document.getElementById('tabTranscriptBtn');
    if(!first||!first.parentElement) return;
    const nav=first.parentElement;
    const style=document.createElement('style');
    style.id='miWin11NavStyleV2';
    style.textContent=`
      .mi-module-nav{display:grid !important;grid-template-columns:repeat(5,minmax(0,1fr)) !important;grid-auto-rows:minmax(46px,auto) !important;gap:7px !important;width:100% !important;overflow:visible !important;padding:7px !important;box-sizing:border-box !important}
      .mi-module-nav > button.mi-module-btn{min-width:0 !important;min-height:44px !important;height:auto !important;padding:8px 10px !important;white-space:normal !important;overflow:visible !important;text-overflow:clip !important;line-height:1.2 !important;word-break:normal !important;overflow-wrap:anywhere !important;box-sizing:border-box !important}
      .mi-module-nav > button.mi-module-btn .mi-module-label{display:block !important;min-width:0 !important;max-width:none !important;white-space:normal !important;overflow:visible !important;text-overflow:clip !important;overflow-wrap:anywhere !important;text-align:center !important}
      .mi-module-nav > button.mi-module-btn:nth-child(6){grid-column:1}
      .mi-module-nav > button.mi-module-btn:nth-child(n+6){grid-row:2}
      body.mi-meeting-mode #miSessionSidebar{display:block !important}
      body.mi-meeting-mode main{width:100% !important;max-width:none !important;min-width:0 !important;box-sizing:border-box !important;overflow:visible !important}
      body.mi-meeting-mode main > section{min-width:0 !important;max-width:100% !important;box-sizing:border-box !important}
      .mi-actions-moved{width:100% !important;box-sizing:border-box !important}
      #actionsTab{width:100% !important;min-width:0 !important;box-sizing:border-box !important}
      #actionsTab .grid{min-width:0 !important}
      #actionsTab button{min-height:44px !important}
      @media (max-width:900px){.mi-module-nav{grid-template-columns:repeat(3,minmax(0,1fr)) !important}.mi-module-nav > button.mi-module-btn:nth-child(6){grid-column:auto}.mi-module-nav > button.mi-module-btn:nth-child(n+6){grid-row:auto}}
      @media (max-width:560px){.mi-module-nav{grid-template-columns:repeat(2,minmax(0,1fr)) !important}}
    `;
    document.head.appendChild(style);
    nav.setAttribute('data-nav-layout','module-workspace');
    NAV.forEach(id=>{const b=document.getElementById(id);if(b){b.style.whiteSpace='normal';b.style.overflow='visible';b.style.textOverflow='clip';b.style.boxSizing='border-box';if(LABELS[id])b.textContent=LABELS[id]}});
    ensureActionsWorkspace(nav);
  }
  function boot(){setTimeout(apply,0);setTimeout(()=>{if(!document.getElementById('tabActionsBtn'))apply()},300)}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
  window.addEventListener('load',()=>setTimeout(apply,0),{once:true});
})();
