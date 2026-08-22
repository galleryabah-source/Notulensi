import http from 'node:http';
import { once } from 'node:events';
import { writeFileSync } from 'node:fs';
let version='candidate-v1';let healthy=true;const port=4189;
const server=http.createServer((req,res)=>{if(req.url==='/health'){res.writeHead(healthy?200:503,{'content-type':'application/json'});return res.end(JSON.stringify({ok:healthy,version}));}res.writeHead(404);res.end();});server.listen(port,'127.0.0.1');await once(server,'listening');
const probe=()=>new Promise(resolve=>http.get({host:'127.0.0.1',port,path:'/health'},res=>{let b='';res.on('data',c=>b+=c);res.on('end',()=>resolve({status:res.statusCode,body:JSON.parse(b)}));}).on('error',()=>resolve({status:0})));
const candidate=await probe();version='candidate-v2';healthy=false;const failed=await probe();version='candidate-v1';healthy=true;const rollback=await probe();server.close();
const status=candidate.status===200&&candidate.body.version==='candidate-v1'&&failed.status===503&&rollback.status===200&&rollback.body.version==='candidate-v1'?'PASS':'FAIL';
const report={schemaVersion:'1.0.0',status,checks:{candidateHealthy:candidate.status===200,canaryFailureDetected:failed.status===503,rollbackHealthy:rollback.status===200,rolledBackVersion:rollback.body?.version},release:{candidate:'candidate-v2',rollbackTarget:'candidate-v1'}};writeFileSync('phase17-execution/release-runtime.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(status!=='PASS')process.exitCode=1;
