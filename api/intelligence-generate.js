import { db, ensureTable } from './ai-config.js';
import { resolveProvider, generate, extractText } from './_ai-provider.js';

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  let client;
  try{
    client=await db().connect(); await ensureTable(client);
    const provider=await resolveProvider(client,req.body?.provider||null);
    if(!provider.configured && provider.id==='gemini' && process.env.GEMINI_API_KEY){provider.configured=true;provider.key=process.env.GEMINI_API_KEY;}
    if(!provider.configured) return res.status(503).json({error:'AI provider is not configured.',configured:false,provider:provider.id,model:provider.model});
    const prompt=String(req.body?.prompt||'').trim();
    if(!prompt) return res.status(400).json({error:'Prompt is required.'});
    if(prompt.length>50000) return res.status(413).json({error:'Prompt is too large.'});
    const result=await generate(provider,prompt);
    const raw=await result.response.text(); let data={}; try{data=JSON.parse(raw);}catch{data={raw};}
    if(!result.response.ok){const detail=data?.error?.message||(typeof data?.error==='string'?data.error:'')||`HTTP ${result.response.status}`;const quota=result.response.status===429;console.error('intelligence-generate provider failure',JSON.stringify({provider:provider.id,status:result.response.status,model:result.model,quota,detail:String(detail).slice(0,1000)}));return res.status(quota?429:502).json({error:quota?'AI provider quota exceeded. Please wait for quota reset or configure a provider with available quota.':'AI provider request failed.',provider:provider.id,model:result.model,status:result.response.status,quota,details:String(detail).slice(0,1000)});}
    const text=extractText(provider.id,data).trim();
    if(!text)return res.status(502).json({error:'AI provider returned empty output.',provider:provider.id,model:result.model});
    return res.status(200).json({ok:true,provider:provider.id,model:result.model,text});
  }catch(error){console.error('intelligence-generate',error);const timeout=/timeout/i.test(String(error?.message||''));return res.status(timeout?504:503).json({error:timeout?'AI provider timed out. Please retry.':error.message||'Intelligence generation unavailable.',timeout});}
  finally{client?.release();}
}
