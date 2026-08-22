import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import jwt from 'jsonwebtoken';
import pg from 'pg';
const {Pool}=pg;
const root=process.cwd(),port=Number(process.env.R2_4_PORT||4184),base=`http://127.0.0.1:${port}`,secret=process.env.JWT_SECRET,databaseUrl=process.env.DATABASE_URL,issuer=process.env.AUTH_ISSUER,audience=process.env.AUTH_AUDIENCE,output=`${root}/phase17-execution/r2.4-ai-runtime.json`;
if(!secret||secret.length<32||!databaseUrl)throw new Error('R2.4 runtime configuration missing');
const ids={user:'44444444-4444-4444-8444-444444444444',other:'55555555-5555-4555-8555-555555555555'};
const pool=new Pool({connectionString:databaseUrl});
const result={schemaVersion:'1.0.0',runId:randomUUID(),generatedAt:new Date().toISOString(),status:'FAIL',provider:'controlled-test-provider',checks:[]};
const check=(name,passed,details)=>result.checks.push({name,status:passed?'PASS':'FAIL',details});
const token=sub=>jwt.sign({sub},secret,{algorithm:'HS256',issuer,audience,expiresIn:'10m'});
async function request(t,prompt,outputTokens=2){return fetch(`${base}/api/ai/generate`,{method:'POST',headers:{authorization:`Bearer ${t}`,'content-type':'application/json'},body:JSON.stringify({prompt,outputTokens})});}
let server;
try{
 await pool.query(`CREATE TABLE IF NOT EXISTS r2_4_ai_usage(id BIGSERIAL PRIMARY KEY,identity_id UUID NOT NULL,provider TEXT NOT NULL,model TEXT NOT NULL,input_tokens INTEGER NOT NULL,output_tokens INTEGER NOT NULL,cost_usd NUMERIC(18,9) NOT NULL,prompt_hash TEXT NOT NULL,prompt_text TEXT,created_at TIMESTAMPTZ NOT NULL DEFAULT now());CREATE TABLE IF NOT EXISTS r2_4_ai_budget_alerts(id BIGSERIAL PRIMARY KEY,identity_id UUID NOT NULL,usage_usd NUMERIC(18,9) NOT NULL,threshold_usd NUMERIC(18,9) NOT NULL,alerted BOOLEAN NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now());TRUNCATE r2_4_ai_usage,r2_4_ai_budget_alerts;`);
 server=spawn(process.execPath,['server/r2.4-ai-runtime.mjs'],{cwd:root,env:process.env,stdio:['ignore','pipe','pipe']});
 let ready=false;for(let i=0;i<40;i++){try{const r=await fetch(`${base}/health`,{signal:AbortSignal.timeout(500)});if(r.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,250));}
 check('AI runtime reachable',ready,'health='+ (ready?'ready':'not-ready'));if(!ready)throw new Error('runtime_not_ready');
 const userToken=token(ids.user), otherToken=token(ids.other);
 const unauth=await fetch(`${base}/api/ai/generate`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({prompt:'unauthenticated probe'})});check('Authentication boundary',unauth.status===401,`HTTP ${unauth.status}`);
 const first=await request(userToken,'controlled meeting summary probe',2);const fb=await first.json();check('Provider usage verified',first.status===200&&fb.provider==='controlled-test-provider'&&fb.usage?.input_tokens>0&&fb.usage?.output_tokens===2,`HTTP ${first.status}; provider=${fb.provider}; usage=${JSON.stringify(fb.usage)}`);
 const expected=(Number(fb.usage?.input_tokens||0)*Number(fb.costModel?.inputRate||0))+(Number(fb.usage?.output_tokens||0)*Number(fb.costModel?.outputRate||0));check('Cost model verified',first.status===200&&Math.abs(Number(fb.usage?.cost_usd||0)-expected)<1e-12&&Math.abs(Number(fb.costModel?.calculatedCost||0)-expected)<1e-12,`expected=${expected}; persisted=${fb.usage?.cost_usd}; calculated=${fb.costModel?.calculatedCost}`);
 const second=await request(userToken,'budget alert probe',2);const sb=await second.json();check('Per-identity attribution',second.status===200&&sb.usage?.identity_id===ids.user,`HTTP ${second.status}; identity=${sb.usage?.identity_id}`);
 const alert=Number(sb.budget?.thresholdUsd)>0&&sb.budget?.alerted===true;check('Budget alert tested',second.status===200&&alert,`HTTP ${second.status}; alerted=${sb.budget?.alerted}; total=${sb.budget?.totalCost}; threshold=${sb.budget?.thresholdUsd}`);
 const other=await request(otherToken,'identity isolation probe',1);const ob=await other.json();check('Identity usage isolated',other.status===200&&ob.usage?.identity_id===ids.other,`HTTP ${other.status}; identity=${ob.usage?.identity_id}`);
 const anomaly=await request(userToken,'x '.repeat(201),2);check('Anomaly controls',anomaly.status===429,`HTTP ${anomaly.status}`);
 const rows=await pool.query('SELECT COUNT(*)::int AS count, COUNT(*) FILTER (WHERE prompt_text IS NOT NULL)::int AS retained FROM r2_4_ai_usage');check('No sensitive prompt retention',Number(rows.rows[0].count)>=3&&Number(rows.rows[0].retained)===0,`events=${rows.rows[0].count}; prompt_text_nonnull=${rows.rows[0].retained}`);
 const ledger=await pool.query('SELECT COUNT(*)::int AS count, COUNT(*) FILTER (WHERE identity_id=$1)::int AS user_events, COUNT(*) FILTER (WHERE identity_id=$2)::int AS other_events FROM r2_4_ai_usage',[ids.user,ids.other]);check('Usage ledger persisted',Number(ledger.rows[0].count)>=3&&Number(ledger.rows[0].user_events)>=2&&Number(ledger.rows[0].other_events)>=1,JSON.stringify(ledger.rows[0]));
}catch(e){check('Harness execution',false,e instanceof Error?e.message:String(e));}finally{if(server)server.kill('SIGTERM');await pool.end();}
result.status=result.checks.length>0&&result.checks.every(c=>c.status==='PASS')?'PASS':'FAIL';writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));if(result.status!=='PASS')process.exitCode=1;
