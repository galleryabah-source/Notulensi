import { decrypt, db, ensureTable, readConfig, PROVIDERS, envSecret } from './ai-config.js';

async function getProvider(client, id) {
  const cfg = await readConfig(client);
  const provider = id || cfg.defaultProvider || 'gemini';
  const saved = cfg.providers?.[provider];
  if (!PROVIDERS[provider] || !saved?.key) return { configured:false, id:provider, meta:PROVIDERS[provider]||null, key:'', model:saved?.model||PROVIDERS[provider]?.model||null };
  const key = String(saved.key).startsWith('env:') ? envSecret(provider) : decrypt(saved.key);
  return { configured:Boolean(key), id:provider, meta:PROVIDERS[provider], key:key||'', model:saved.model||PROVIDERS[provider].model };
}
async function generate(p,prompt){
  if(p.id==='gemini') return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(p.model)}:generateContent?key=${encodeURIComponent(p.key)}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:prompt}]}]})});
  const endpoint=p.id==='openrouter'?'https://openrouter.ai/api/v1/chat/completions':p.id==='groq'?'https://api.groq.com/openai/v1/chat/completions':p.id==='mistral'?'https://api.mistral.ai/v1/chat/completions':'https://api-inference.huggingface.co/models/'+encodeURIComponent(p.model);
  const body=p.id==='huggingface'?{inputs:prompt}:{model:p.model,messages:[{role:'user',content:prompt}]};
  return fetch(endpoint,{method:'POST',headers:{'content-type':'application/json',Authorization:`Bearer ${p.key}`},body:JSON.stringify(body)});
}
function extract(id,data){if(id==='gemini')return data?.candidates?.[0]?.content?.parts?.map(x=>x.text||'').join('')||'';if(id==='huggingface')return Array.isArray(data)?data.map(x=>x.generated_text||'').join(''):(data?.generated_text||'');return data?.choices?.[0]?.message?.content||'';}
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  const client=await db().connect();
  try{
    await ensureTable(client);
    const p=await getProvider(client,req.body?.provider||null);
    if(!p.configured)return res.status(503).json({error:'AI provider is not configured.',configured:false,provider:p.id,model:p.model});
    const source=String(req.body?.transcript||req.body?.source||'').trim();
    if(!source)return res.status(400).json({error:'Transcript source is required.'});
    if(source.length>60000)return res.status(413).json({error:'Transcript source is too large.'});
    const prompt=`Anda adalah mesin transkripsi rapat untuk aplikasi Notulensi. Ubah bahan berikut menjadi transkrip rapat berbahasa Indonesia yang rapi. Pertahankan semua fakta dan urutan pembicaraan. Jangan meringkas dan jangan mengarang. Jika pembicara tidak diketahui, gunakan label Pembicara.\n\nBAHAN:\n${source}`;
    const r=await generate(p,prompt);const raw=await r.text();let data;try{data=JSON.parse(raw)}catch{data={raw}};
    if(!r.ok)return res.status(r.status>=400&&r.status<600?r.status:502).json({error:'AI provider request failed.',provider:p.id,details:data?.error?.message||data?.error||undefined});
    const text=extract(p.id,data).trim();
    if(!text)return res.status(502).json({error:'AI provider returned empty transcript.',provider:p.id,model:p.model});
    return res.status(200).json({ok:true,kind:'meeting-transcript',provider:p.id,model:p.model,text});
  }catch(error){console.error('transcript-generate',error);return res.status(503).json({error:error.message||'Transcript generation unavailable.'});}
  finally{client.release();}
}
