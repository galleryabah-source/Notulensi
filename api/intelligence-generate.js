import { decrypt, db, ensureTable, readConfig, PROVIDERS, envSecret } from './ai-config.js';

async function provider(client, id) {
  const cfg = await readConfig(client); const name=id||cfg.defaultProvider||'gemini'; const saved=cfg.providers?.[name];
  if(!PROVIDERS[name]||!saved?.key)return {configured:false,id:name,meta:PROVIDERS[name]||null,key:'',model:saved?.model||PROVIDERS[name]?.model||null};
  const key=String(saved.key).startsWith('env:')?envSecret(name):decrypt(saved.key);
  return {configured:Boolean(key),id:name,meta:PROVIDERS[name],key:key||'',model:saved.model||PROVIDERS[name].model};
}
async function invoke(p,prompt){
  if(p.id==='gemini')return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(p.model)}:generateContent?key=${encodeURIComponent(p.key)}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:prompt}]}]})});
  const endpoint=p.id==='openrouter'?'https://openrouter.ai/api/v1/chat/completions':p.id==='groq'?'https://api.groq.com/openai/v1/chat/completions':p.id==='mistral'?'https://api.mistral.ai/v1/chat/completions':'https://api-inference.huggingface.co/models/'+encodeURIComponent(p.model);
  const body=p.id==='huggingface'?{inputs:prompt}:{model:p.model,messages:[{role:'user',content:prompt}]};
  return fetch(endpoint,{method:'POST',headers:{'content-type':'application/json',Authorization:`Bearer ${p.key}`},body:JSON.stringify(body)});
}
function text(id,d){if(id==='gemini')return d?.candidates?.[0]?.content?.parts?.map(x=>x.text||'').join('')||'';if(id==='huggingface')return Array.isArray(d)?d.map(x=>x.generated_text||'').join(''):(d?.generated_text||'');return d?.choices?.[0]?.message?.content||'';}
export default async function handler(req,res){res.setHeader('Cache-Control','no-store');if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});let client;try{client=await db().connect();await ensureTable(client);const p=await provider(client,req.body?.provider);if(!p.configured)return res.status(503).json({error:'AI provider is not configured.',configured:false,provider:p.id});const prompt=String(req.body?.prompt||'').trim();if(!prompt)return res.status(400).json({error:'Prompt is required.'});if(prompt.length>50000)return res.status(413).json({error:'Prompt is too large.'});const r=await invoke(p,prompt);const raw=await r.text();let d;try{d=JSON.parse(raw)}catch{d={raw}}if(!r.ok)return res.status(502).json({error:'AI provider request failed.',provider:p.id,status:r.status,details:d?.error?.message||d?.error||undefined});const out=text(p.id,d).trim();if(!out)return res.status(502).json({error:'AI provider returned empty output.',provider:p.id});return res.status(200).json({ok:true,provider:p.id,model:p.model,text:out});}catch(e){console.error('intelligence-generate',e);return res.status(503).json({error:e.message||'Intelligence generation unavailable.'});}finally{client?.release()}}
