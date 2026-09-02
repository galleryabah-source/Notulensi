import { decrypt, envSecret, envBaseUrl, envModel, envGatewayToken, PROVIDERS, readConfig, safeBaseUrl } from './ai-config.js';

const AI_TIMEOUT_MS = 25000;
function withTimeout(promiseFactory, ms = AI_TIMEOUT_MS) {
  const controller = new AbortController();
  let timer;
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error(`AI provider timeout after ${ms}ms`)); }, ms); });
  return Promise.race([promiseFactory(controller.signal), timeout]).finally(() => clearTimeout(timer));
}
export async function resolveProvider(client, requestedId) {
  const cfg = await readConfig(client); const id = requestedId || cfg.defaultProvider || 'ollama'; const meta = PROVIDERS[id]; const saved = cfg.providers?.[id] || {};
  if (!meta) return { configured:false,id,meta:null,key:'',model:null,baseUrl:'' };
  if (id === 'ollama') {
    const baseUrl = safeBaseUrl(envBaseUrl('ollama') || saved.baseUrl);
    const model = envModel('ollama') || saved.model || meta.model;
    const gatewayToken = envGatewayToken('ollama');
    return { configured:Boolean(baseUrl && gatewayToken),id,meta,key:'',gatewayToken,model,baseUrl };
  }
  if (!saved.key) return { configured:false,id,meta,key:'',model:saved.model || meta.model };
  const key = String(saved.key).startsWith('env:') ? envSecret(id) : decrypt(saved.key); return { configured:Boolean(key),id,meta,key:key || '',model:saved.model || meta.model,baseUrl:'' };
}
async function geminiRequest(key, model, prompt) { const clean=String(model||'').replace(/^models\//,''); return withTimeout(signal => fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(clean)}:generateContent?key=${encodeURIComponent(key)}`, {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:prompt}]}]}),signal})); }
async function discoverGeminiModel(key) { const r=await withTimeout(signal=>fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,{signal})); const raw=await r.text(); let data={}; try{data=JSON.parse(raw)}catch{} if(!r.ok)return{model:null}; const supported=(Array.isArray(data.models)?data.models:[]).filter(m=>Array.isArray(m.supportedGenerationMethods)&&m.supportedGenerationMethods.includes('generateContent')); const rank=['gemini-3.6-flash','gemini-3.6-flash-lite','gemini-3.5-flash','gemini-3-flash','gemini-2.5-flash','gemini-2.5-flash-lite','gemini-2.0-flash']; for(const wanted of rank){const hit=supported.find(m=>String(m.name||'').replace(/^models\//,'')===wanted);if(hit)return{model:String(hit.name).replace(/^models\//,'')}} const first=supported.find(m=>/flash/i.test(String(m.name||'')))||supported[0]; return {model:first?String(first.name).replace(/^models\//,''):null}; }
async function ollamaRequest(baseUrl, model, prompt, gatewayToken) {
  return withTimeout(signal=>fetch(`${baseUrl.replace(/\/$/,'')}/api/chat`,{
    method:'POST',
    headers:{'content-type':'application/json',Authorization:`Bearer ${gatewayToken}`},
    body:JSON.stringify({model,messages:[{role:'user',content:prompt}],stream:false,options:{temperature:0.2}}),
    signal
  }),60000);
}
export async function generate(provider,prompt) { if(provider.id==='ollama'){const model=String(provider.model||PROVIDERS.ollama.model);return{response:await ollamaRequest(provider.baseUrl,model,prompt,provider.gatewayToken),model};} if(provider.id==='gemini'){let model=String(provider.model||PROVIDERS.gemini.model).replace(/^models\//,'');let response=await geminiRequest(provider.key,model,prompt);if(response.status===404||response.status===400){const discovered=await discoverGeminiModel(provider.key);if(discovered.model&&discovered.model!==model){model=discovered.model;response=await geminiRequest(provider.key,model,prompt);}}return{response,model};} const endpoint=provider.id==='openrouter'?'https://openrouter.ai/api/v1/chat/completions':provider.id==='groq'?'https://api.groq.com/openai/v1/chat/completions':provider.id==='mistral'?'https://api.mistral.ai/v1/chat/completions':'https://api-inference.huggingface.co/models/'+encodeURIComponent(provider.model); const body=provider.id==='huggingface'?{inputs:prompt}:{model:provider.model,messages:[{role:'user',content:prompt}]}; return{response:await withTimeout(signal=>fetch(endpoint,{method:'POST',headers:{'content-type':'application/json',Authorization:`Bearer ${provider.key}`},body:JSON.stringify(body),signal})),model:provider.model}; }
export function extractText(id,data){if(id==='ollama')return data?.message?.content||data?.response||'';if(id==='gemini')return data?.candidates?.[0]?.content?.parts?.map(x=>x.text||'').join('')||'';if(id==='huggingface')return Array.isArray(data)?data.map(x=>x.generated_text||'').join(''):(data?.generated_text||'');return data?.choices?.[0]?.message?.content||'';}
export async function smokeTest(provider){const result=await generate(provider,'Reply with exactly OK.');const raw=await result.response.text();let data={};try{data=JSON.parse(raw)}catch{}if(!result.response.ok)return{healthy:false,status:result.response.status,model:result.model,error:data?.error?.message||data?.error||`HTTP ${result.response.status}`};const text=extractText(provider.id,data).trim();return text?{healthy:true,status:result.response.status,model:result.model}:{healthy:false,status:502,model:result.model,error:'Provider returned empty output.'};}
export { localHealth } from './local-ai.js';
