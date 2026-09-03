import { db, ensureTable } from './ai-config.js';
import { resolveProvider, generate, extractText } from '../server/ai-provider.js';

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  let client;
  try{
    client=await db().connect(); await ensureTable(client);
    const provider=await resolveProvider(client,req.body?.provider||null);
    if(!provider.configured) return res.status(503).json({error:'AI provider is not configured.',configured:false,provider:provider.id,model:provider.model});
    const source=String(req.body?.transcript||req.body?.source||'').trim();
    if(!source) return res.status(400).json({error:'Transcript source is required.'});
    if(source.length>60000) return res.status(413).json({error:'Transcript source is too large.'});
    const prompt=`Anda adalah mesin transkripsi rapat untuk aplikasi Notulensi. Ubah bahan berikut menjadi transkrip rapat berbahasa Indonesia yang rapi. Pertahankan semua fakta dan urutan pembicaraan. Jangan meringkas dan jangan mengarang. Jika pembicara tidak diketahui, gunakan label Pembicara.\n\nBAHAN:\n${source}`;
    const result=await generate(provider,prompt);const raw=await result.response.text();let data={};try{data=JSON.parse(raw);}catch{data={raw};}
    if(!result.response.ok){const detail=data?.error?.message||(typeof data?.error==='string'?data.error:'')||`HTTP ${result.response.status}`;const quota=result.response.status===429;console.error('transcript-generate provider failure',JSON.stringify({provider:provider.id,status:result.response.status,model:result.model,quota,detail:String(detail).slice(0,1000)}));return res.status(quota?429:502).json({error:quota?'AI provider quota exceeded. Please wait for quota reset or configure a provider with available quota.':'AI provider request failed.',provider:provider.id,model:result.model,status:result.response.status,quota,details:String(detail).slice(0,1000)});}
    const text=extractText(provider.id,data).trim();if(!text)return res.status(502).json({error:'AI provider returned empty transcript.',provider:provider.id,model:result.model});return res.status(200).json({ok:true,kind:'meeting-transcript',provider:provider.id,model:result.model,text});
  }catch(error){console.error('transcript-generate',error);const timeout=/timeout/i.test(String(error?.message||''));return res.status(timeout?504:503).json({error:timeout?'AI provider timed out. Please retry.':error.message||'Transcript generation unavailable.',timeout});}
  finally{client?.release();}
}
