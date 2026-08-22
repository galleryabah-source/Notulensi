(function(){
  'use strict';
  const NAV=['tabTranscriptBtn','tabIntelBtn','tabDashboardBtn','tabCrossBtn','tabContinuityBtn','tabGraphBtn','tabReportBtn','tabDocsBtn','tabHistoryBtn'];
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
      @media (max-width:900px){.mi-module-nav{grid-template-columns:repeat(3,minmax(0,1fr)) !important}.mi-module-nav > button.mi-module-btn:nth-child(6){grid-column:auto}.mi-module-nav > button.mi-module-btn:nth-child(n+6){grid-row:auto}}
      @media (max-width:560px){.mi-module-nav{grid-template-columns:repeat(2,minmax(0,1fr)) !important}}
    `;
    document.head.appendChild(style);
    nav.setAttribute('data-nav-layout','two-row');
    NAV.forEach(id=>{const b=document.getElementById(id);if(b){b.style.whiteSpace='normal';b.style.overflow='visible';b.style.textOverflow='clip';b.style.boxSizing='border-box'}});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(apply,0),{once:true}); else setTimeout(apply,0);
  window.addEventListener('load',()=>setTimeout(apply,0),{once:true});
})();
