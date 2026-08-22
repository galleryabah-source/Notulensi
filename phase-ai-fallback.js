/* Phase AI fallback router.
 * Keeps the legacy Gemini intelligence engine intact while allowing text-generation
 * requests to fail over to healthy OpenAI-compatible providers configured by the user.
 * Never invents credentials and never enables a provider without a stored key + health PASS.
 */
(function(){
  'use strict';
  const SETTINGS_KEY='meeting_ai_provider_settings_v1';
  const HEALTH_KEY='meeting_ai_provider_health_v1';
  const ROUTE_KEY='meeting_ai_fallback_runtime_v1';
  const FALLBACK_ORDER=['groq','openrouter','mistral'];
  const endpoints={
    groq:'https://api.groq.com/openai/v1/chat/completions',
    openrouter:'https://openrouter.ai/api/v1/chat/completions',
    mistral:'https://api.mistral.ai/v1/chat/completions'
  };
  const defaults={
    groq:'llama-3.3-70b-versatile',
    openrouter:'openrouter/free',
    mistral:'mistral-small-latest'
  };
  let originalFetch=window.fetch.bind(window);
  let fallbackProvider=null;

  function read(key){try{return JSON.parse(localStorage.getItem(key)||'{}')}catch(e){return {}}}
  function healthyProviderIds(){
    const cfg=read(SETTINGS_KEY),health=read(HEALTH_KEY);
    return FALLBACK_ORDER.filter(id=>cfg[id]?.key && health[id]?.healthy);
  }
  function setRuntime(provider,status,detail){
    const payload={provider,status,detail:detail||'',updatedAt:new Date().toISOString()};
    try{localStorage.setItem(ROUTE_KEY,JSON.stringify(payload))}catch(e){}
    try{window.dispatchEvent(new CustomEvent('meeting-ai-fallback-status',{detail:payload}))}catch(e){}
  }
  function isGeminiRequest(input){
    try{
      const url=typeof input==='string'?input:input?.url||'';
      return /generativelanguage\.googleapis\.com\/v1beta\/models\/[^/]+:generateContent/i.test(url);
    }catch(e){return false}
  }
  function bodyFromInit(init){
    try{return typeof init?.body==='string'?JSON.parse(init.body):init?.body||{}}catch(e){return {}}
  }
  function extractPrompt(body){
    const parts=body?.contents?.flatMap(c=>c?.parts||[])||[];
    return parts.filter(p=>typeof p?.text==='string').map(p=>p.text).join('\n').trim();
  }
  function toOpenAIRequest(prompt,model){
    return JSON.stringify({
      model,
      messages:[{role:'user',content:prompt}],
      temperature:0.2
    });
  }
  async function tryProvider(provider,prompt){
    const cfg=read(SETTINGS_KEY),key=String(cfg?.[provider]?.key||'').trim();
    if(!key)return null;
    const model=String(cfg?.[provider]?.model||defaults[provider]||'').trim();
    const headers={'Content-Type':'application/json','Authorization':'Bearer '+key};
    if(provider==='openrouter'){
      headers['HTTP-Referer']=location.origin;
      headers['X-Title']='Notulensi Meeting Intelligence';
    }
    const r=await originalFetch(endpoints[provider],{method:'POST',headers,body:toOpenAIRequest(prompt,model)});
    const j=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(j?.error?.message||j?.message||('HTTP '+r.status));
    const text=j?.choices?.[0]?.message?.content||'';
    if(!text)throw new Error('Provider returned empty content');
    return {text,provider,model};
  }
  function shouldFallbackStatus(status,message){
    const m=String(message||'').toLowerCase();
    return status===429 || /quota|rate limit|rate_limit|resource_exhausted|too many requests|capacity|temporarily unavailable/.test(m);
  }

  window.fetch=async function(input,init){
    if(!fallbackProvider || !isGeminiRequest(input)) return originalFetch(input,init);
    const body=bodyFromInit(init);
    const prompt=extractPrompt(body);
    if(!prompt) return originalFetch(input,init);
    const cfg=read(SETTINGS_KEY);
    const provider=fallbackProvider;
    try{
      const result=await tryProvider(provider,prompt);
      fallbackProvider=null;
      setRuntime(provider,'fallback-success','Generated using fallback provider.');
      return new Response(JSON.stringify({candidates:[{content:{parts:[{text:result.text}]}}]}),{status:200,headers:{'Content-Type':'application/json'}});
    }catch(e){
      setRuntime(provider,'fallback-failed',e.message);
      fallbackProvider=null;
      return new Response(JSON.stringify({error:{message:e.message}}),{status:502,headers:{'Content-Type':'application/json'}});
    }
  };

  function wrapRun(){
    if(typeof window.runAITask!=='function' || window.runAITask.__fallbackWrapped)return;
    const originalRun=window.runAITask;
    async function wrappedRun(type){
      try{
        return await originalRun(type);
      }catch(e){
        if(!shouldFallbackStatus(e?.status,e?.message))throw e;
        const candidates=healthyProviderIds();
        if(!candidates.length)throw e;
        let last=e;
        for(const provider of candidates){
          try{
            fallbackProvider=provider;
            setRuntime(provider,'fallback-start','Primary Gemini limit reached; trying fallback.');
            return await originalRun(type);
          }catch(err){
            last=err;
            if(shouldFallbackStatus(err?.status,err?.message))continue;
          }finally{fallbackProvider=null}
        }
        throw last;
      }
    }
    wrappedRun.__fallbackWrapped=true;
    window.runAITask=wrappedRun;
  }

  window.addEventListener('ai-settings-updated',wrapRun);
  window.addEventListener('meeting-ai-settings-updated',wrapRun);
  wrapRun();
  setTimeout(wrapRun,1000);
  setTimeout(wrapRun,2500);
})();
