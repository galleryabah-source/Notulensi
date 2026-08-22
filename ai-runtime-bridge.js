(function(){
  'use strict';
  const KEY='meeting_ai_provider_settings_v1';
  const HEALTH_KEY='meeting_ai_provider_health_v1';
  const LEGACY_KEY='meeting_ai_settings';
  const OFFLINE_TEXT='API Key belum diisi';
  const ids=['gemini','groq','openrouter','huggingface','mistral'];
  const models={gemini:'gemini-2.5-flash',groq:'llama-3.3-70b-versatile',openrouter:'openrouter/free',huggingface:'meta-llama/Llama-3.1-8B-Instruct',mistral:'mistral-small-latest'};
  function read(key){try{return JSON.parse(localStorage.getItem(key)||'{}')}catch(e){return {}}}
  function write(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch(e){console.warn('AI runtime bridge storage write failed:',e);return false}}
  function getState(){
    const cfg=read(KEY), health=read(HEALTH_KEY);
    const healthy=ids.filter(id=>cfg[id]&&cfg[id].key&&health[id]&&health[id].healthy);
    const preferred=cfg.defaultProvider;
    const provider=healthy.includes(preferred)?preferred:(healthy[0]||null);
    return {online:!!provider,provider,model:provider?(cfg[provider].model||models[provider]):null,healthy,config:cfg};
  }
  function syncLegacyAppSettings(s){
    if(!s.online||!s.provider||!s.config?.[s.provider]?.key)return false;
    const current=read(LEGACY_KEY);
    const next={...current,apiKey:String(s.config[s.provider].key||'').trim()};
    if(s.config[s.provider].model)next.model=s.config[s.provider].model;
    const changed=JSON.stringify(current)!==JSON.stringify(next);
    if(changed)write(LEGACY_KEY,next);
    try{if(typeof window.loadSettings==='function')window.loadSettings();if(typeof window.updateApiBadge==='function')window.updateApiBadge()}catch(e){console.warn('Legacy AI runtime refresh failed:',e)}
    return changed;
  }
  function applyBadge(el,s){
    if(!el)return;
    const text=s.online?'AI Online · '+s.provider:'AI Offline · '+OFFLINE_TEXT;
    if(el.textContent!==text)el.textContent=text;
    el.className=s.online
      ?'px-3 py-1 text-xs rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
      :'px-3 py-1 text-xs rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20';
    el.setAttribute('data-ai-runtime-status',s.online?'online':'offline');
  }
  function syncDashboard(s){
    const badge=document.getElementById('apiStatusBadge');
    applyBadge(badge,s);
    document.querySelectorAll('[data-ai-status]').forEach(el=>{
      el.textContent=s.online?'AI Online · '+s.provider:'AI Offline · '+OFFLINE_TEXT;
      el.style.color=s.online?'#86efac':'#fbbf24';
    });
    window.meetingAIStatus=s;
  }
  function render(){
    const s=getState();
    if(s.online)syncLegacyAppSettings(s);
    let el=document.getElementById('aiRuntimeStatus');
    if(!el){
      el=document.createElement('div');
      el.id='aiRuntimeStatus';
      el.style.cssText='position:fixed;right:14px;bottom:14px;z-index:10002;padding:8px 11px;border:1px solid #334155;border-radius:10px;background:#0f172a;color:#cbd5e1;font:600 12px system-ui,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.35);';
      document.body.appendChild(el);
    }
    el.textContent=s.online?'AI Online · '+s.provider+' · '+s.model:'AI Offline · '+OFFLINE_TEXT;
    el.style.color=s.online?'#86efac':'#fbbf24';
    syncDashboard(s);
    try{window.dispatchEvent(new CustomEvent('meeting-ai-status',{detail:s}))}catch(e){}
  }
  window.addEventListener('storage',render);
  window.addEventListener('ai-settings-updated',render);
  window.addEventListener('message',function(e){if(e.data&&e.data.type==='meeting-ai-settings-updated')render()});
  render();
})();
