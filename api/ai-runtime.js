import { db, ensureTable } from './ai-config.js';
import { resolveProvider, generate, extractText, smokeTest, discoverGeminiModel } from './_ai-provider.js';
const AUDIO_MAX_BYTES=2500000,CHUNK_MAX_BYTES=900000,TIMEOUT_MS=45000;
const cleanAudio=v=>String(v||'').replace(/^data:[^;]+;base64,/,'').replace(/\s+/g,'');
const audioMime=v=>{const m=String(v||'audio/webm').toLowerCase();return /^audio\/(webm|ogg|mpeg|wav|mp4|mp3|x-m4a)$/.test(m)?m:'audio/webm'};
const timed=fn=>{const c=new AbortController(),t=setTimeout(()=>c.abort(),TIMEOUT_MS);return Promise.resolve().then(()=>fn(c.signal)).finally(()=>clearTimeout(t))};
async function geminiAudioRequest(secret,model,prompt,type,audio){return timed(signal=>fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(String(model).replace(/^models\//,''))}:generateContent?key=${encodeURIComponent(secret)}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:prompt},{inlineData:{mimeType:type,data:audio}}]}],generationConfig:{temperature:0.1}}),signal}))}
async function transcribeAudio(provider,body,chunkMode){const audio=cleanAudio(body?.audio),type=audioMime(body?.mimeType),limit=chunkMode?CHUNK_MAX_BYTES:AUDIO_MAX_BYTES;if(!audio)return {status:400,body:{error:chunkMode?'Audio chunk is required.':'Audio data is required.'}};if(Math.floor(audio.length*3/4)>limit)return {status:413,body:{error:chunkMode?'Chunk exceeds 900 KB.':'Audio data is too large. Keep capture chunks below 2.5 MB.'}};if(!provider.configured)return {status:503,body:{error:'Gemini server provider is not configured.',configured:false,provider:provider.id}};if(provider.id!=='gemini')return {status:400,body:{error:'Source audio transcription currently requires Gemini. Configure Gemini in Admin AI settings.',provider:provider.id}};let model=String(provider.model||'').replace(/^models\//,'');const prompt=String(body?.prompt||(chunkMode?'Transcribe this audio chunk exactly in Indonesian. Preserve spoken words and identify speakers when possible. Return transcript text only.':'Transcribe this audio exactly in Indonesian. Preserve the order of speech. Do not summarize. If speakers are not identifiable, label them Pembicara 1, Pembicara 2, etc. Return plain transcript text only.'));let r=await geminiAudioRequest(provider.key,model,prompt,type,audio);if(r.status===400||r.status===404){const discovered=await discoverGeminiModel(provider.key);if(discovered.model&&discovered.model!==model){model=discovered.model;r=await geminiAudioRequest(provider.key,model,prompt,type,audio);}}const raw=await r.text();let d={};try{d=JSON.parse(raw)}catch{}if(!r.ok)return {status:r.status===429?429:(r.status>=500?502:r.status),body:{error:chunkMode?'Chunk transcription provider failed.':'Audio transcription provider failed.',status:r.status,details:String(d?.error?.message||'').slice(0,500)}};const text=(d?.candidates?.[0]?.content?.parts||[]).map(x=>x.text||'').join('').trim();if(!text)return {status:502,body:{error:chunkMode?'Empty transcript chunk.':'AI provider returned an empty audio transcript.'}};return {status:200,body:{ok:true,text,provider:provider.id,model,source:chunkMode?(body?.source||'capture'):'audio',...(chunkMode?{chunkIndex:Number(body?.chunkIndex||0)}:{})}}}

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(!['GET','POST'].includes(req.method)) return res.status(405).json({error:'Method not allowed'});
  let client;
  try{
    client=await db().connect(); await ensureTable(client);
    const requestedProvider=req.method==='GET'?(typeof req.query?.provider==='string'?req.query.provider:null):req.body?.provider;
    const provider=await resolveProvider(client,requestedProvider);
    if(!provider.configured && provider.id==='gemini' && process.env.GEMINI_API_KEY){provider.configured=true;provider.key=process.env.GEMINI_API_KEY;}
    if(req.method==='GET'){
      if(!provider.configured)return res.status(200).json({healthy:false,configured:false,provider:provider.id,model:provider.model,status:0,reason:'AI provider is not configured.'});
      const smoke=await smokeTest(provider);
      return res.status(200).json({healthy:smoke.healthy,configured:true,provider:provider.id,model:smoke.model||provider.model,status:smoke.status||0,reason:smoke.healthy?null:smoke.error||'AI generation test failed.'});
    }
    const sourceAudio=req.query?.mode==='source-transcribe'||req.body?.sourceAudio===true||req.body?.chunkMode===true;
    if(sourceAudio){const result=await transcribeAudio(provider,req.body,req.query?.mode==='source-transcribe'&&req.body?.chunkMode===true);return res.status(result.status).json(result.body)}
    if(!provider.configured)return res.status(503).json({error:'AI provider is not configured.',configured:false,provider:provider.id,model:provider.model});
    const prompt=String(req.body?.prompt||'').trim();
    if(!prompt||prompt.length>50000)return res.status(400).json({error:'Prompt is required and must be <= 50000 characters.'});
    const result=await generate(provider,prompt); const raw=await result.response.text(); let data={}; try{data=JSON.parse(raw);}catch{data={raw};}
    if(!result.response.ok){const detail=data?.error?.message||(typeof data?.error==='string'?data.error:'')||`HTTP ${result.response.status}`;console.error('ai-runtime provider failure',JSON.stringify({provider:provider.id,status:result.response.status,model:result.model,detail:String(detail).slice(0,1000)}));return res.status(502).json({error:'AI provider request failed.',provider:provider.id,model:result.model,status:result.response.status,details:String(detail).slice(0,1000)});}
    const text=extractText(provider.id,data).trim();
    if(!text)return res.status(502).json({error:'AI provider returned empty content.',provider:provider.id,model:result.model});
    return res.status(200).json({ok:true,provider:provider.id,model:result.model,text});
  }catch(error){console.error('ai-runtime',error);return res.status(error?.name==='AbortError'?504:503).json({error:error?.name==='AbortError'?'Audio transcription timed out.':error.message||'AI runtime unavailable.'});}
  finally{client?.release();}
}
