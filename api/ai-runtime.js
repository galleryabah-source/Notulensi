import { decrypt, db, ensureTable, readConfig, PROVIDERS } from './ai-config.js';

async function getProvider(client, id) {
  const cfg = await readConfig(client);
  const provider = id || cfg.defaultProvider || 'gemini';
  const saved = cfg.providers?.[provider];
  if (!PROVIDERS[provider] || !saved?.key) throw new Error('AI provider is not configured.');
  return { id: provider, meta: PROVIDERS[provider], key: decrypt(saved.key), model: saved.model || PROVIDERS[provider].model };
}
async function health(p) {
  if (p.id === 'gemini') return fetch(`${p.meta.testUrl}?key=${encodeURIComponent(p.key)}`);
  return fetch(p.meta.testUrl, { headers: { Authorization: `Bearer ${p.key}` } });
}
async function generate(p, prompt) {
  if (p.id === 'gemini') {
    return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(p.model)}:generateContent?key=${encodeURIComponent(p.key)}`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({contents:[{parts:[{text:prompt}]}]}) });
  }
  const endpoint = p.id === 'openrouter' ? 'https://openrouter.ai/api/v1/chat/completions' : p.id === 'groq' ? 'https://api.groq.com/openai/v1/chat/completions' : p.id === 'mistral' ? 'https://api.mistral.ai/v1/chat/completions' : 'https://api-inference.huggingface.co/models/' + encodeURIComponent(p.model);
  const body = p.id === 'huggingface' ? { inputs: prompt } : { model:p.model, messages:[{role:'user',content:prompt}] };
  return fetch(endpoint,{method:'POST',headers:{'content-type':'application/json',Authorization:`Bearer ${p.key}`},body:JSON.stringify(body)});
}
function extractText(id, data) {
  if (id === 'gemini') return data?.candidates?.[0]?.content?.parts?.map(x=>x.text||'').join('') || '';
  if (id === 'huggingface') return Array.isArray(data) ? data.map(x=>x.generated_text||'').join('') : (data?.generated_text||'');
  return data?.choices?.[0]?.message?.content || '';
}
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if (!['GET','POST'].includes(req.method)) return res.status(405).json({error:'Method not allowed'});
  const client=await db().connect();
  try{
    await ensureTable(client);
    const p=await getProvider(client, req.body?.provider);
    if(req.method==='GET'){
      const r=await health(p);
      // Public health metadata is intentionally non-secret. The provider key
      // is never returned to the browser; only availability/provider/model/status
      // are exposed so the public UI can accurately show AI connectivity.
      return res.status(200).json({healthy:r.ok,provider:p.id,model:p.model,status:r.status});
    }
    const prompt=String(req.body?.prompt||'').trim();
    if(!prompt || prompt.length>20000) return res.status(400).json({error:'Prompt is required and must be <= 20000 characters.'});
    const r=await generate(p,prompt); const raw=await r.text(); let data; try{data=JSON.parse(raw)}catch{data={raw}};
    if(!r.ok) return res.status(r.status>=400&&r.status<600?r.status:502).json({error:'AI provider request failed.',provider:p.id,details:data?.error?.message||data?.error||undefined});
    return res.status(200).json({ok:true,provider:p.id,model:p.model,text:extractText(p.id,data),raw:data});
  }catch(error){console.error('ai-runtime',error);return res.status(503).json({error:error.message||'AI runtime unavailable.'});}
  finally{client.release();}
}
