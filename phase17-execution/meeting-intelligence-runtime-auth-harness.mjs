import http from 'node:http';
const base = process.env.RUNTIME_BASE_URL || 'http://127.0.0.1:4173';
function req(method, path, body, cookie) { return new Promise((resolve,reject)=>{ const u=new URL(path,base); const p=body===undefined?null:JSON.stringify(body); const r=http.request(u,{method,headers:{...(p?{'content-type':'application/json','content-length':Buffer.byteLength(p)}:{}),...(cookie?{cookie}: {})}},res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:d}));});r.on('error',reject);if(p)r.write(p);r.end();}); }
const checks=[]; const check=(id,exp,act,detail)=>{const status=exp===act?'PASS':'FAIL';checks.push({id,status,expected:exp,actual:act,detail});return status==='PASS';};
try {
 let r=await req('GET','/meeting-intelligence-app-phase4.3-integrated-safe.html');
 check('17-E.auth.real_app.entrypoint',200,r.status,'Real application entrypoint must be served by the runtime adapter.');
 check('17-E.auth.real_app.adapter',true,r.body.includes('data-phase17-auth'), 'Runtime adapter must inject the authentication bootstrap without modifying the stored UI baseline.');
 r=await req('GET','/api/auth/me'); check('17-E.auth.real_app.unauthenticated',401,r.status,'Unauthenticated runtime request must be rejected.');
 r=await req('POST','/api/auth/login',{username:'viewer-a',password:'phase17-viewer-password'}); const cookie=r.headers['set-cookie']?.[0]?.split(';',1)[0]; check('17-E.auth.real_app.login',200,r.status,'Valid credentials must authenticate through the same runtime origin.');
 r=await req('GET','/api/auth/me',undefined,cookie); check('17-E.auth.real_app.session',200,r.status,'Runtime must recognize the authenticated session.');
 r=await req('GET','/api/protected/admin',undefined,cookie); check('17-E.auth.real_app.rbac',403,r.status,'Viewer must be denied ADMIN resource.');
 r=await req('GET','/api/protected/owners/owner-a',undefined,cookie); check('17-E.auth.real_app.owner',200,r.status,'Matching owner must be allowed.');
 r=await req('GET','/api/protected/owners/owner-b',undefined,cookie); check('17-E.auth.real_app.cross_owner',403,r.status,'Cross-owner access must be denied.');
 r=await req('POST','/api/auth/logout',undefined,cookie); check('17-E.auth.real_app.logout',200,r.status,'Logout must revoke the session.');
 r=await req('GET','/api/auth/me',undefined,cookie); check('17-E.auth.real_app.revocation',401,r.status,'Revoked session must be rejected.');
} catch(e) { checks.push({id:'17-E.auth.real_app.harness',status:'FAIL',expected:'reachable runtime adapter',actual:'error',detail:e.message}); }
const report={schemaVersion:'1.0.0',harness:'17-E.11-D real application runtime authentication adapter',generatedAt:new Date().toISOString(),applicationRuntimeIntegrated:true,integrationFixture:false,checks};
console.log(JSON.stringify(report,null,2)); process.exitCode=checks.some(x=>x.status!=='PASS')?1:0;
