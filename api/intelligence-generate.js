import { decrypt, db, ensureTable, readConfig, PROVIDERS, envSecret } from './ai-config.js';

async function provider(client, id) {
  const cfg = await readConfig(client);
  const name = id || cfg.defaultProvider || 'gemini';
  const saved = cfg.providers?.[name];
  if (!PROVIDERS[name] || !saved?.key) return { configured:false, id:name, meta:PROVIDERS[name]||null, key:'', model:saved?.model||PROVIDERS[name]?.model||null };
  const key = String(saved.key).startsWith('env:') ? envSecret(name) : decrypt(saved.key);
  return { configured:Boolean(key), id:name, meta:PROVIDERS[name], key:key||'', model:saved.model||PROVIDERS[name].model };
}

async function geminiRequest(key, model, prompt) {
  const cleanModel = String(model||'').replace(/^models\//,'');
  return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cleanModel)}:generateContent?key=${encodeURIComponent(key)}`, {
    method:'POST', headers:{'content-type':'application/json'},
    body:JSON.stringify({contents:[{parts:[{text:prompt}]}]})
  });
}

async function findGeminiFallback(key) {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`);
  const raw = await r.text();
  let data; try { data=JSON.parse(raw); } catch { data={}; }
  if (!r.ok) return null;
  const models = Array.isArray(data.models) ? data.models : [];
  const supported = models.filter(m => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'));
  const preferred = ['gemini-2.5-flash','gemini-2.0-flash','gemini-2.5-flash-lite'];
  for (const wanted of preferred) {
    const hit = supported.find(m => String(m.name||'').replace(/^models\//,'')===wanted);
    if (hit) return String(hit.name).replace(/^models\//,'');
  }
  const first = supported.find(m => /flash/i.test(String(m.name||''))) || supported[0];
  return first ? String(first.name).replace(/^models\//,'') : null;
}

async function invoke(p,prompt){
  if(p.id==='gemini') {
    let model = String(p.model||PROVIDERS.gemini.model).replace(/^models\//,'');
    let r = await geminiRequest(p.key, model, prompt);
    if (r.status === 404) {
      const fallback = await findGeminiFallback(p.key).catch(()=>null);
      if (fallback && fallback !== model) { model=fallback; r=await geminiRequest(p.key, model, prompt); }
    }
    return { response:r, model };
  }
  const endpoint=p.id==='openrouter'?'https://openrouter.ai/api/v1/chat/completions':p.id==='groq'?'https://api.groq.com/openai/v1/chat/completions':p.id==='mistral'?'https://api.mistral.ai/v1/chat/completions':'https://api-inference.huggingface.co/models/'+encodeURIComponent(p.model);
  const body=p.id==='huggingface'?{inputs:prompt}:{model:p.model,messages:[{role:'user',content:prompt}]};
  return { response:await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json',Authorization:`Bearer ${p.key}`},body:JSON.stringify(body)}), model:p.model };
}

function text(id,d){if(id==='gemini')return d?.candidates?.[0]?.content?.parts?.map(x=>x.text||'').join('')||'';if(id==='huggingface')return Array.isArray(d)?d.map(x=>x.generated_text||'').join(''):(d?.generated_text||'');return d?.choices?.[0]?.message?.content||'';}

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  let client;
  try{
    client=await db().connect(); await ensureTable(client);
    const p=await provider(client,req.body?.provider);
    if(!p.configured)return res.status(503).json({error:'AI provider is not configured.',configured:false,provider:p.id});
    const prompt=String(req.body?.prompt||'').trim();
    if(!prompt)return res.status(400).json({error:'Prompt is required.'});
    if(prompt.length>50000)return res.status(413).json({error:'Prompt is too large.'});
    const result=await invoke(p,prompt); const r=result.response; const usedModel=result.model;
    const raw=await r.text(); let d; try{d=JSON.parse(raw)}catch{d={raw}};
    if(!r.ok){
      const detail=d?.error?.message || (typeof d?.error==='string'?d.error:'') || (typeof d?.message==='string'?d.message:'') || `HTTP ${r.status}`;
      console.error('intelligence-generate provider failure',JSON.stringify({provider:p.id,status:r.status,model:usedModel,detail:String(detail).slice(0,1000)}));
      return res.status(502).json({error:'AI provider request failed.',provider:p.id,model:usedModel,status:r.status,details:String(detail).slice(0,1000)});
    }
    const out=text(p.id,d).trim();
    if(!out)return res.status(502).json({error:'AI provider returned empty output.',provider:p.id,model:usedModel});
    return res.status(200).json({ok:true,provider:p.id,model:usedModel,text:out});
  }catch(e){console.error('intelligence-generate',e);return res.status(503).json({error:e.message||'Intelligence generation unavailable.'});}
  finally{client?.release();}
}
