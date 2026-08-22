import { db, ensureTable } from './ai-config.js';
import { resolveProvider, generate, extractText, smokeTest } from './_ai-provider.js';

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(!['GET','POST'].includes(req.method)) return res.status(405).json({error:'Method not allowed'});
  let client;
  try{
    client=await db().connect(); await ensureTable(client);
    const requestedProvider=req.method==='GET'?(typeof req.query?.provider==='string'?req.query.provider:null):req.body?.provider;
    const provider=await resolveProvider(client,requestedProvider);
    if(req.method==='GET'){
      if(!provider.configured)return res.status(200).json({healthy:false,configured:false,provider:provider.id,model:provider.model,status:0,reason:'AI provider is not configured.'});
      const smoke=await smokeTest(provider);
      return res.status(200).json({healthy:smoke.healthy,configured:true,provider:provider.id,model:smoke.model||provider.model,status:smoke.status||0,reason:smoke.healthy?null:smoke.error||'AI generation test failed.'});
    }
    if(!provider.configured)return res.status(503).json({error:'AI provider is not configured.',configured:false,provider:provider.id,model:provider.model});
    const prompt=String(req.body?.prompt||'').trim();
    if(!prompt||prompt.length>50000)return res.status(400).json({error:'Prompt is required and must be <= 50000 characters.'});
    const result=await generate(provider,prompt); const raw=await result.response.text(); let data={}; try{data=JSON.parse(raw);}catch{data={raw};}
    if(!result.response.ok){const detail=data?.error?.message||(typeof data?.error==='string'?data.error:'')||`HTTP ${result.response.status}`;console.error('ai-runtime provider failure',JSON.stringify({provider:provider.id,status:result.response.status,model:result.model,detail:String(detail).slice(0,1000)}));return res.status(502).json({error:'AI provider request failed.',provider:provider.id,model:result.model,status:result.response.status,details:String(detail).slice(0,1000)});}
    const text=extractText(provider.id,data).trim();
    if(!text)return res.status(502).json({error:'AI provider returned empty content.',provider:provider.id,model:result.model});
    return res.status(200).json({ok:true,provider:provider.id,model:result.model,text});
  }catch(error){console.error('ai-runtime',error);return res.status(503).json({error:error.message||'AI runtime unavailable.'});}
  finally{client?.release();}
}
