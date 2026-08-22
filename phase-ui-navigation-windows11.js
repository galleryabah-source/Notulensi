(function(){
  'use strict';

  const NAV_IDS = [
    'tabTranscriptBtn','tabIntelBtn','tabDashboardBtn','tabCrossBtn',
    'tabContinuityBtn','tabGraphBtn','tabReportBtn','tabDocsBtn','tabHistoryBtn'
  ];

  const NAV_META = {
    tabTranscriptBtn: {label:'Transkrip', icon:'🎙️', desc:'Rekam, unggah, dan kelola transkrip rapat', mode:'meeting'},
    tabIntelBtn: {label:'Intelligence', icon:'🧠', desc:'Analisis AI: ringkasan, keputusan, action, risiko, topik', mode:'meeting'},
    tabDashboardBtn: {label:'Dashboard', icon:'📊', desc:'Metrik, efektivitas, sentimen, risiko dan topik', mode:'module', title:'Dashboard', subtitle:'Ringkasan kinerja dan statistik seluruh rapat'},
    tabCrossBtn: {label:'Cross-Meeting', icon:'🔗', desc:'Analisis hubungan lintas rapat', mode:'module', title:'Cross-Meeting Intelligence', subtitle:'Hubungkan pola, keputusan, action item, risiko, dan topik lintas rapat'},
    tabContinuityBtn: {label:'Tindak Lanjut', icon:'🎯', desc:'Pantau action item dan kesinambungan keputusan', mode:'module', title:'Tindak Lanjut & Keputusan', subtitle:'Pantau status action item dan kesinambungan keputusan tanpa mengubah history sumber'},
    tabGraphBtn: {label:'Knowledge', icon:'🕸️', desc:'Knowledge Graph dan organizational memory', mode:'module', title:'Knowledge Graph', subtitle:'Peta relasi rapat, orang/PIC, keputusan, action, risiko, dan topik'},
    tabReportBtn: {label:'Laporan', icon:'📑', desc:'Laporan resmi dan hasil analisis', mode:'module', title:'Laporan', subtitle:'Hasil analisis yang siap dibaca, disalin, dan diekspor'},
    tabDocsBtn: {label:'Dokumen & Revisi', icon:'📄', desc:'Dokumen AI, template, versioning dan traceability', mode:'module', title:'Dokumen & Revisi', subtitle:'Kelola dokumen, template, revision snapshot, dan traceability'},
    tabHistoryBtn: {label:'Riwayat', icon:'🕘', desc:'Arsip rapat dan hasil sebelumnya', mode:'module', title:'Riwayat Rapat', subtitle:'Arsip sesi, transkrip, intelligence, laporan, dan dokumen sebelumnya'}
  };

  function ensureStyle(){
    if(document.getElementById('miWin11NavStyle')) return;
    const style=document.createElement('style');
    style.id='miWin11NavStyle';
    style.textContent=`
      .mi-module-nav{
        display:grid !important;
        grid-template-columns:repeat(9,minmax(82px,1fr));
        gap:6px !important;
        width:100%;
        overflow:visible !important;
        padding:6px !important;
        margin:0 0 10px 0;
        background:rgba(15,23,42,.78);
        border:1px solid rgba(100,116,139,.34);
        border-radius:12px;
        box-shadow:0 8px 28px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.03);
        backdrop-filter:blur(14px);
      }
      .mi-module-nav > button.mi-module-btn{
        position:relative;
        display:flex !important;
        align-items:center;
        justify-content:center;
        gap:7px;
        min-height:38px;
        padding:8px 10px !important;
        border:1px solid rgba(100,116,139,.28) !important;
        border-radius:8px !important;
        background:rgba(30,41,59,.58) !important;
        color:#cbd5e1 !important;
        font:600 12px/1.15 Inter,system-ui,sans-serif !important;
        letter-spacing:.01em;
        white-space:nowrap !important;
        overflow:hidden;
        text-overflow:ellipsis;
        cursor:pointer;
        transition:background .14s ease,border-color .14s ease,color .14s ease,box-shadow .14s ease,transform .08s ease;
      }
      .mi-module-nav > button.mi-module-btn:hover{background:rgba(51,65,85,.9) !important;border-color:rgba(148,163,184,.52) !important;color:#f8fafc !important}
      .mi-module-nav > button.mi-module-btn:active{transform:translateY(1px)}
      .mi-module-nav > button.mi-module-btn:focus-visible{outline:2px solid #60a5fa;outline-offset:1px}
      .mi-module-nav > button.mi-module-btn.mi-active{background:rgba(37,99,235,.18) !important;border-color:rgba(96,165,250,.78) !important;color:#dbeafe !important;box-shadow:inset 0 0 0 1px rgba(96,165,250,.12),0 4px 14px rgba(37,99,235,.12)}
      .mi-module-nav > button.mi-module-btn.mi-active::after{content:"";position:absolute;left:12px;right:12px;bottom:3px;height:2px;border-radius:999px;background:#60a5fa}
      .mi-module-icon{font-size:14px;line-height:1}.mi-module-label{overflow:hidden;text-overflow:ellipsis}
      .mi-module-caption{display:flex;align-items:center;gap:8px;margin:0 0 8px 2px;color:#94a3b8;font-size:11px}.mi-module-caption strong{color:#e2e8f0;font-weight:600}
      .mi-module-toolbar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:10px;margin:0 0 12px;background:rgba(2,6,23,.44);border:1px solid rgba(71,85,105,.36);border-radius:10px}
      .mi-tool-btn{display:inline-flex;align-items:center;gap:7px;min-height:34px;padding:7px 11px;border-radius:7px;border:1px solid rgba(100,116,139,.38);background:rgba(30,41,59,.72);color:#cbd5e1;font:600 12px/1 Inter,system-ui,sans-serif;cursor:pointer}
      .mi-tool-btn:hover{background:rgba(51,65,85,.94);color:#fff;border-color:rgba(148,163,184,.5)}.mi-tool-btn.primary{background:#2563eb;border-color:#3b82f6;color:#fff}.mi-tool-btn.success{background:#047857;border-color:#10b981;color:#fff}.mi-tool-btn:focus-visible{outline:2px solid #60a5fa;outline-offset:1px}
      .mi-page-shell{display:flex !important;flex-direction:column !important;min-width:0 !important}.mi-page-shell > *{width:100% !important}.mi-page-shell .mi-page-panel{background:rgba(15,23,42,.88);border:1px solid rgba(71,85,105,.45);border-radius:16px;padding:2px;box-shadow:0 14px 42px rgba(0,0,0,.2)}
      .mi-module-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin:0 0 14px;padding:14px 16px;border:1px solid rgba(100,116,139,.34);border-radius:12px;background:linear-gradient(180deg,rgba(30,41,59,.78),rgba(15,23,42,.78));box-shadow:inset 0 1px 0 rgba(255,255,255,.03)}
      .mi-module-header h2{margin:0;color:#f8fafc;font-size:17px;font-weight:700}.mi-module-header p{margin:4px 0 0;color:#94a3b8;font-size:11px;line-height:1.45}.mi-module-header .mi-module-context{font-size:11px;color:#64748b;text-align:right;white-space:nowrap}
      .mi-back-btn{display:inline-flex;align-items:center;gap:7px;min-height:32px;padding:7px 10px;border-radius:7px;border:1px solid rgba(100,116,139,.38);background:rgba(30,41,59,.72);color:#cbd5e1;font:600 12px Inter,system-ui,sans-serif;cursor:pointer}.mi-back-btn:hover{background:rgba(51,65,85,.94);color:#fff}
      #miSessionSidebar.mi-collapsed{display:none !important}.mi-module-mode main{grid-template-columns:1fr !important}.mi-module-mode main > section{grid-column:1 / -1 !important}.mi-module-mode #miModuleHost{display:block !important}
      @media (max-width:1100px){.mi-module-nav{grid-template-columns:repeat(5,minmax(92px,1fr))}.mi-module-header{flex-direction:column}.mi-module-header .mi-module-context{text-align:left}}
      @media (max-width:700px){.mi-module-nav{grid-template-columns:repeat(3,minmax(92px,1fr))}}
      @media (max-width:450px){.mi-module-nav{grid-template-columns:repeat(2,minmax(105px,1fr))}}
    `;
    document.head.appendChild(style);
  }

  function setupNav(){
    const first=document.getElementById('tabTranscriptBtn');
    if(!first) return;
    const nav=first.parentElement;
    if(!nav) return;
    nav.classList.add('mi-module-nav');nav.classList.remove('overflow-x-auto');nav.setAttribute('role','tablist');nav.setAttribute('aria-label','Modul Meeting Intelligence');
    NAV_IDS.forEach(id=>{
      const btn=document.getElementById(id), meta=NAV_META[id];if(!btn||!meta)return;
      btn.classList.add('mi-module-btn');btn.classList.remove('pb-3','border-b-2','border-transparent','border-indigo-500','text-indigo-400','text-slate-400');
      btn.setAttribute('role','tab');btn.setAttribute('title',meta.desc);btn.setAttribute('aria-label',meta.desc);
      btn.innerHTML=`<span class="mi-module-icon" aria-hidden="true">${meta.icon}</span><span class="mi-module-label">${meta.label}</span>`;
      if(!btn.dataset.miBound){btn.dataset.miBound='1';btn.addEventListener('click',()=>setTimeout(()=>applyWorkspaceForCurrentTab(),0),{passive:true})}
    });
  }

  function syncActiveState(){
    NAV_IDS.forEach(id=>{const btn=document.getElementById(id);if(!btn)return;const contentId=btn.getAttribute('onclick')?.match(/switchTab\('([^']+)'\)/)?.[1];const panel=contentId?document.getElementById(contentId):null;const active=!!panel&&!panel.classList.contains('hidden');btn.classList.toggle('mi-active',active);btn.setAttribute('aria-selected',active?'true':'false')});
  }

  function addModuleCaption(){
    const nav=document.querySelector('.mi-module-nav');if(!nav||document.getElementById('miModuleCaption'))return;
    const cap=document.createElement('div');cap.id='miModuleCaption';cap.className='mi-module-caption';cap.innerHTML='<strong>Modul Utama</strong><span>Akses cepat ke seluruh fungsi sesuai alur kerja Meeting Intelligence.</span>';nav.parentElement.insertBefore(cap,nav);
  }

  function addModuleHost(){
    const main=document.querySelector('main');if(!main||document.getElementById('miModuleHost'))return;
    const host=document.createElement('div');host.id='miModuleHost';host.style.display='none';main.appendChild(host);
  }

  function ensureSidebarMarker(){
    const main=document.querySelector('main');const sidebar=main?.querySelector(':scope > section:first-child');if(sidebar&&!sidebar.id)sidebar.id='miSessionSidebar';
  }

  function moduleHeader(meta){
    const header=document.createElement('div');header.className='mi-module-header';
    header.innerHTML=`<div><h2>${meta.icon} ${meta.title}</h2><p>${meta.subtitle}</p></div><div class="mi-module-context">Workspace Modul</div>`;
    const back=document.createElement('button');back.className='mi-back-btn';back.type='button';back.textContent='← Kembali ke Rapat';back.onclick=()=>window.switchTab?.('transcriptTab');header.appendChild(back);
    return header;
  }

  function addModuleHeader(tabId,meta){
    const tab=document.getElementById(tabId);if(!tab||!meta||tab.querySelector(':scope > .mi-module-header'))return;
    tab.insertBefore(moduleHeader(meta),tab.firstChild);
  }

  function applyWorkspaceForCurrentTab(){
    const active= NAV_IDS.map(id=>({id,meta:NAV_META[id],btn:document.getElementById(id)})).find(x=>x.btn?.classList.contains('mi-active'));
    const main=document.querySelector('main');const sidebar=document.getElementById('miSessionSidebar');
    if(!main||!active)return;
    const moduleMode=active.meta.mode==='module';
    document.body.classList.toggle('mi-module-mode',moduleMode);
    sidebar?.classList.toggle('mi-collapsed',moduleMode);
    if(moduleMode){
      ['dashboardTab','crossMeetingTab','continuityTab','knowledgeGraphTab','reportTab','docsTab','historyTab'].forEach(id=>addModuleHeader(id,NAV_META[NAV_IDS[['dashboardTab','crossMeetingTab','continuityTab','knowledgeGraphTab','reportTab','docsTab','historyTab'].indexOf(id)]]||{}));
    }
    setTimeout(()=>syncActiveState(),0);
  }

  function addDocsToolbar(){
    const docs=document.getElementById('docsTab');if(!docs||document.getElementById('miDocsToolbar'))return;
    const bar=document.createElement('div');bar.id='miDocsToolbar';bar.className='mi-module-toolbar';
    bar.innerHTML='<button class="mi-tool-btn primary" type="button" onclick="switchTab(\'docsTab\')">📄 Dokumen & Revisi</button><button class="mi-tool-btn success" type="button" onclick="saveCurrentDocumentRevisionV42?.()">💾 Simpan Revisi</button><button class="mi-tool-btn" type="button" onclick="renderPhase42Versioning?.()">🔄 Refresh Revisi</button><button class="mi-tool-btn" type="button" onclick="exportCurrentRevisionManifestV42?.()">⬇️ Export Manifest</button><button class="mi-tool-btn" type="button" onclick="runPhase42SelfTest?.()">✓ Self-Test</button>';
    docs.prepend(bar);
  }

  function addKnowledgeToolbar(){
    const tab=document.getElementById('knowledgeGraphTab');if(!tab||document.getElementById('miKnowledgeToolbar'))return;
    const bar=document.createElement('div');bar.id='miKnowledgeToolbar';bar.className='mi-module-toolbar';bar.innerHTML='<button class="mi-tool-btn primary" type="button" onclick="buildKnowledgeGraph?.();renderKnowledgeGraphInspector?.()">🕸️ Bangun Knowledge Graph</button><button class="mi-tool-btn" type="button" onclick="loadKnowledgeGraph?.();renderKnowledgeGraph?.();renderKnowledgeGraphInspector?.()">🔄 Refresh</button><button class="mi-tool-btn" type="button" onclick="exportKnowledgeGraph?.()">⬇️ Export Graph</button>';tab.prepend(bar);
  }

  function addReportToolbar(){
    const tab=document.getElementById('reportTab');if(!tab||document.getElementById('miReportToolbar'))return;
    const bar=document.createElement('div');bar.id='miReportToolbar';bar.className='mi-module-toolbar';bar.innerHTML='<button class="mi-tool-btn" type="button" onclick="copyReport?.()">📋 Salin Laporan</button><button class="mi-tool-btn" type="button" onclick="exportAsText?.()">TXT</button><button class="mi-tool-btn" type="button" onclick="exportAsMarkdown?.()">Markdown</button>';tab.prepend(bar);
  }

  function addContinuityToolbar(){
    const tab=document.getElementById('continuityTab');if(!tab||document.getElementById('miContinuityCaption'))return;
    const cap=document.createElement('div');cap.id='miContinuityCaption';cap.className='mi-module-caption';cap.innerHTML='<strong>Tindak Lanjut & Keputusan</strong><span>Tracking status terpisah dari history sumber.</span>';tab.prepend(cap);
  }

  function prepare(){
    ensureStyle();setupNav();addModuleCaption();addModuleHost();ensureSidebarMarker();addDocsToolbar();addKnowledgeToolbar();addReportToolbar();addContinuityToolbar();
    ['dashboardTab','crossMeetingTab','continuityTab','knowledgeGraphTab','reportTab','docsTab','historyTab'].forEach(id=>{const meta=NAV_META[NAV_IDS[['dashboardTab','crossMeetingTab','continuityTab','knowledgeGraphTab','reportTab','docsTab','historyTab'].indexOf(id)]];if(meta)addModuleHeader(id,meta)});
    syncActiveState();applyWorkspaceForCurrentTab();
  }

  window.miApplyModuleWorkspace=applyWorkspaceForCurrentTab;
  window.addEventListener('load',()=>setTimeout(prepare,0),{once:true});
  document.addEventListener('DOMContentLoaded',()=>setTimeout(prepare,0),{once:true});
  setTimeout(prepare,0);
})();
