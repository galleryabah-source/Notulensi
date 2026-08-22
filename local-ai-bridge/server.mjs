import http from 'node:http';
import crypto from 'node:crypto';

const PORT=Number(process.env.PORT||8787);
const OLLAMA_URL=(process.env.OLLAMA_URL||'http://127.0.0.1:11434').replace(/\/$/,'');
const TOKEN=String(process.env.LOCAL_AI_BRIDGE_TOKEN||'');
const ORIGIN=String(process.env.ALLOWED_ORIGIN||'');
const MAX_BODY=1024*1024;
const TIMEOUT=30000;
if(!TOKEN) throw new Error('LOCAL_AI_BRIDGE_TOKEN is required');
function auth(req){const h=String(req.headers.authorization||'');const provided=h.startsWith('Bearer ')?h.slice(7):'';return provided.length===TOKEN.length&&crypto.timingSafeEqual(Buffer.from(provided),Buffer.from(TOKEN));}
function headers(res){res.setHeader('content-type','application/json');res.setHeader('cache-control','no-store');if(ORIGIN)res.setHeader('access-control-allow-origin',ORIGIN);res.setHeader('access-control-allow-headers','content-type,authorization');res.setHeader('access-control-allow-methods','GET,POST,OPTIONS');}
async function readBody(req){let n=0;const chunks=[];for await(const c of req){n+=c.length;if(n>MAX_BODY)throw new Error('Request body too large');chunks.push(c)}return Buffer.concat(chunks).toString('utf8');}
async function proxy(path,method,body){const controller=new AbortController();const t=setTimeout(()=>controller.abort(),TIMEOUT);try{const r=await fetch(`${OLLAMA_URL}${path}`,{method,headers:{'content-type':'application/json'},body,signal:controller.signal});const text=await r.text();return{status:r.status,text}}finally{clearTimeout(t)}}
const server=http.createServer(async(req,res)=>{headers(res);if(req.method==='OPTIONS'){res.writeHead(204);return res.end()}if(!auth(req)){res.writeHead(401);return res.end(JSON.stringify({error:'Unauthorized'}))}try{if(req.method==='GET'&&req.url==='/health'){const x=await proxy('/api/tags','GET');res.writeHead(x.status===200?200:503);return res.end(JSON.stringify({ok:x.status===200,ollamaStatus:x.status}))}if(req.method==='GET'&&req.url==='/api/tags'){const x=await proxy('/api/tags','GET');res.writeHead(x.status);return res.end(x.text)}if(req.method==='POST'&&req.url==='/api/chat'){const body=await readBody(req);const x=await proxy('/api/chat','POST',body);res.writeHead(x.status);return res.end(x.text)}res.writeHead(404);res.end(JSON.stringify({error:'Not found'}))}catch(e){res.writeHead(/too large/i.test(e.message)?413:502);res.end(JSON.stringify({error:e.message||'Bridge failure'}))}});
server.listen(PORT,()=>console.log(`Local AI bridge listening on ${PORT}`));
