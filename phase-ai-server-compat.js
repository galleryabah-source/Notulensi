/* Server AI compatibility layer for the legacy Meeting Intelligence engine.
 * The original engine still guards on a browser Gemini key and calls Gemini directly.
 * This layer keeps that legacy engine/template intact while transparently routing
 * its generateContent calls to the authenticated server AI runtime.
 */
(function(){
  'use strict';
  const SETTINGS_KEY='meeting_ai_settings';
  const SERVER_KEY='__SERVER_MANAGED_AI__';
  const originalFetch=window.fetch.bind(window);
  let installed=false;
  function jsonResponse(text,status=200){return new Response(JSON.stringify({candidates:[{content:{parts:[{text:String(text||'')}]} }]}),{status,headers:{'Content-Type':'application/json'}})}
  function extractBody(init){try{return typeof init?.body==='string'?JSON.parse(init.body):init?.body||{}}catch{return {}}}
  function extractPrompt(body){return (body?.contents||[]).flatMap(c=>c?.parts||[]).map(p=>typeof p?.text==='string'?p.text:'').filter(Boolean).join('\n').trim()}
  function hasSchema(body){return Boolean(body?.generationConfig?.responseSchema)}
  function schemaInstruction(schema){return `\n\nIMPORTANT OUTPUT CONTRACT: Return ONLY valid JSON. It must conform to this JSON schema: ${JSON.stringify(schema)}. Do not use Markdown fences. Do not add commentary.`}
  async function serverGenerate(prompt,schema){
    const fullPrompt=String(prompt||'')+(schema?schemaInstruction(schema):'');
    const r=await originalFetch('./api/ai-runtime',{method:'POST',headers:{'content-type':'application/json'},credentials:'include',cache:'no-store',body:JSON.stringify({prompt:fullPrompt,provider:'gemini'})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(d.error||`Server AI gagal (HTTP ${r.status})`);
    const text=String(d.text||'').trim();
    if(!text)throw new Error('Server AI mengembalikan respons kosong.');
    return text;
  }
  async function routedFetch(input,init){
    const url=typeof input==='string'?input:(input?.url||'');
    if(!/generativelanguage\.googleapis\.com\/v1beta\/models\/[^/]+:generateContent/i.test(url))return originalFetch(input,init);
    const body=extractBody(init);
    const prompt=extractPrompt(body);
    if(!prompt)return originalFetch(input,init);
    try{return jsonResponse(await serverGenerate(prompt,hasSchema(body)?body.generationConfig.responseSchema:null),200)}catch(e){return jsonResponse(JSON.stringify({error:{message:e.message}}),502)}
  }
  async function activate(){
    if(installed)return;
    installed=true;
    try{
      const current=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}');
      if(!String(current.apiKey||'').trim()){
        current.apiKey=SERVER_KEY;
        localStorage.setItem(SETTINGS_KEY,JSON.stringify(current));
        if(typeof window.loadSettings==='function')window.loadSettings();
      }
    }catch(e){console.warn('server AI compatibility settings:',e)}
    window.fetch=routedFetch;
    const badge=document.getElementById('apiStatusBadge');
    if(badge){badge.textContent='AI Online · Server Gemini';badge.className='px-3 py-1 text-xs rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}
    try{const r=await originalFetch('./api/ai-runtime',{cache:'no-store'});const d=await r.json();if(!d.healthy){console.warn('Server AI is not healthy:',d)}}catch(e){console.warn('Server AI health check failed:',e)}
  }
  window.notulensiServerAICompat={activate,serverGenerate};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(activate,100),{once:true});else setTimeout(activate,100);
  setTimeout(activate,500);setTimeout(activate,1500);
})();
