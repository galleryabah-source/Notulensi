/* AI provider compatibility bridge.
 * Public Meeting Intelligence runs AI through the server-side runtime.
 * Browser users never need to provide or retain a provider API key.
 */
(function(){
  'use strict';
  const SETTINGS_KEY = 'meeting_ai_provider_settings_v1';
  const HEALTH_KEY = 'meeting_ai_provider_health_v1';
  const LEGACY_SETTINGS_KEY = 'meeting_ai_settings';
  const LEGACY_KEYS = [
    'geminiApiKey','geminiAPIKey','gemini_api_key','GEMINI_API_KEY',
    'googleGeminiApiKey','google_gemini_api_key'
  ];
  const SERVER_SENTINEL = '__SERVER_MANAGED_AI__';

  function read(key){
    try { return JSON.parse(localStorage.getItem(key) || '{}'); }
    catch(e){ return {}; }
  }
  function removeLegacyCredentials(){
    try {
      const legacy = read(LEGACY_SETTINGS_KEY);
      if (legacy && typeof legacy === 'object') {
        delete legacy.apiKey;
        delete legacy.geminiApiKey;
        delete legacy.geminiAPIKey;
        localStorage.setItem(LEGACY_SETTINGS_KEY, JSON.stringify(legacy));
      }
    } catch(e) {}
    LEGACY_KEYS.forEach(k => { try { localStorage.removeItem(k); } catch(e) {} });
    try {
      const settings = read(SETTINGS_KEY);
      if (settings?.gemini) {
        const sanitized = {...settings, gemini:{...settings.gemini}};
        delete sanitized.gemini.key;
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(sanitized));
      }
    } catch(e) {}
  }
  function getServerStatus(){
    return window.meetingAIStatus || {online:false,provider:null,model:null};
  }
  function ensureServerManagedState(){
    try {
      if (typeof appSettings !== 'undefined' && appSettings && typeof appSettings === 'object') {
        // Runtime-only sentinel: it is never persisted and is never sent to a provider.
        appSettings.apiKey = SERVER_SENTINEL;
      }
    } catch(e) {}
    removeLegacyCredentials();
    hideUserApiKeyControl();
  }
  function hideUserApiKeyControl(){
    const input=document.getElementById('customApiKey');
    if(!input)return;
    const label=input.closest('label');
    if(label){
      label.style.display='none';
      label.setAttribute('data-server-managed-ai','true');
    }
    input.value='';
    input.setAttribute('autocomplete','off');
  }
  function showServerSettingsNotice(){
    const modal=document.getElementById('settingsModal');
    if(!modal || modal.querySelector('[data-server-ai-notice]'))return;
    const box=document.createElement('div');
    box.setAttribute('data-server-ai-notice','true');
    box.className='mb-4 rounded-xl border border-emerald-800 bg-emerald-950/30 p-3 text-xs text-emerald-300';
    box.textContent='AI terhubung melalui server. API Key dikelola oleh Administrator dan tidak perlu dimasukkan oleh pengguna.';
    const first=modal.querySelector('.bg-slate-900 > div');
    if(first)first.insertAdjacentElement('afterend',box);
  }
  function updateBadge(){
    const b=document.getElementById('apiStatusBadge');
    if(!b)return;
    const s=getServerStatus();
    if(s.online){
      b.textContent='AI Online · '+(s.provider||'server');
      b.className='px-3 py-1 text-xs rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    }else{
      b.textContent='AI Offline · Server AI belum dikonfigurasi';
      b.className='px-3 py-1 text-xs rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20';
    }
  }
  function openSettings(){
    const modal=document.getElementById('settingsModal');
    const template=document.getElementById('templateInput');
    if(template){
      try{template.value=(read(LEGACY_SETTINGS_KEY).template||template.value||'');}catch(e){}
    }
    hideUserApiKeyControl();
    showServerSettingsNotice();
    modal?.classList.remove('hidden');
  }
  function closeSettings(){document.getElementById('settingsModal')?.classList.add('hidden');}
  function saveSettingsServerManaged(){
    const template=document.getElementById('templateInput')?.value?.trim()||'';
    const legacy=read(LEGACY_SETTINGS_KEY);
    const sanitized={...legacy};
    delete sanitized.apiKey; delete sanitized.geminiApiKey; delete sanitized.geminiAPIKey;
    if(template)sanitized.template=template;
    try{localStorage.setItem(LEGACY_SETTINGS_KEY,JSON.stringify(sanitized));}catch(e){}
    ensureServerManagedState();
    closeSettings();
    updateBadge();
    try{showToast('Pengaturan disimpan. AI tetap menggunakan konfigurasi server.','success')}catch(e){}
  }
  async function serverCallGemini(prompt,schema){
    if(!window.meetingAIRequest)throw new Error('AI runtime server belum tersedia.');
    const s=getServerStatus();
    if(!s.online)throw new Error('AI server belum terhubung atau belum dikonfigurasi oleh Administrator.');
    const provider=s.provider||'gemini';
    const result=await window.meetingAIRequest(prompt,provider);
    const text=String(result?.text||'').trim();
    if(!text)throw new Error('Respons AI kosong.');
    if(schema){
      try{return JSON.parse(text)}catch(e){
        const cleaned=text.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim();
        return JSON.parse(cleaned);
      }
    }
    return text;
  }
  function install(){
    ensureServerManagedState();
    try {
      window.callGemini=serverCallGemini;
      callGemini=serverCallGemini;
    } catch(e) { window.callGemini=serverCallGemini; }
    try { if(typeof appSettings!=='undefined' && appSettings) appSettings.apiKey=SERVER_SENTINEL; } catch(e) {}
    try { window.openSettingsModal=openSettings; openSettingsModal=openSettings; } catch(e) { window.openSettingsModal=openSettings; }
    try { window.closeSettingsModal=closeSettings; closeSettingsModal=closeSettings; } catch(e) { window.closeSettingsModal=closeSettings; }
    try { window.saveSettings=saveSettingsServerManaged; saveSettings=saveSettingsServerManaged; } catch(e) { window.saveSettings=saveSettingsServerManaged; }
    try { window.updateApiBadge=updateBadge; updateApiBadge=updateBadge; } catch(e) { window.updateApiBadge=updateBadge; }
    updateBadge();
  }

  window.getConfiguredGeminiProvider=function(){
    const s=getServerStatus();
    return {key:SERVER_SENTINEL,model:s.model||null,healthy:Boolean(s.online)};
  };
  window.addEventListener('storage',e=>{
    if(e.key===SETTINGS_KEY||e.key===HEALTH_KEY||e.key===LEGACY_SETTINGS_KEY)ensureServerManagedState();
  });
  window.addEventListener('message',e=>{
    if(e.data&&e.data.type==='meeting-ai-settings-updated'){ensureServerManagedState();updateBadge();}
  });
  window.addEventListener('meeting-ai-status',e=>{
    ensureServerManagedState();
    updateBadge();
  });
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
  setTimeout(install,250);
  setTimeout(install,1000);
})();
