(function(){
  'use strict';
  const KEY='meeting_ai_provider_settings_v1';
  const HEALTH_KEY='meeting_ai_provider_health_v1';
  function read(key){try{return JSON.parse(localStorage.getItem(key)||'{}')}catch(e){return {}}}
  function getState(){
    const cfg=read(KEY), health=read(HEALTH_KEY);
    const ids=['gemini','groq','openrouter','huggingface','mistral'];
    const healthy=ids.filter(id=>cfg[id]&&cfg[id].key&&health[id]&&health[id].healthy);
    const preferred=cfg.defaultProvider;
    const provider=healthy.includes(preferred)?preferred:(healthy[0]||null);
    const models={gemini:'gemini-2.5-flash',groq:'llama-3.3-70b-versatile',openrouter:'openrouter/free',huggingface:'meta-llama/Llama-3.1-8B-Instruct',mistral:'mistral-small-latest'};
    return {online:!!provider,provider,model:provider?(cfg[provider].model||models[provider]):null,healthy};
  }
  function render(){
    const s=getState();
    let el=document.getElementById('aiRuntimeStatus');
    if(!el){el=document.createElement('div');el.id='aiRuntimeStatus';el.style.cssText='position:fixed;right:14px;bottom:14px;z-index:10002;padding:8px 11px;border:1px solid #334155;border-radius:10px;background:#0f172a;color:#cbd5e1;font:600 12px system-ui,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.35);';document.body.appendChild(el)}
    el.textContent=s.online?'AI Online · '+s.provider+' · '+s.model:'AI Offline · API Key belum tervalidasi';
    el.style.color=s.online?'#86efac':'#fbbf24';
    window.meetingAIStatus=s;
    try{window.dispatchEvent(new CustomEvent('meeting-ai-status',{detail:s}))}catch(e){}
  }
  render();
  window.addEventListener('storage',render);
  window.addEventListener('ai-settings-updated',render);
  setInterval(render,3000);
})();
