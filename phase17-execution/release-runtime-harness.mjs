import http from 'node:http';
import { once } from 'node:events';
import { writeFileSync } from 'node:fs';

let version='candidate-v1';
let healthy=true;
let canaryTraffic=0;
let rollbackTriggered=false;
const port=4189;
const server=http.createServer((req,res)=>{
  if(req.url==='/health'){
    res.writeHead(healthy?200:503,{'content-type':'application/json'});
    return res.end(JSON.stringify({ok:healthy,version}));
  }
  if(req.url==='/canary'){
    canaryTraffic++;
    res.writeHead(healthy?200:503,{'content-type':'application/json'});
    return res.end(JSON.stringify({ok:healthy,version,canary:true}));
  }
  res.writeHead(404);res.end();
});
server.listen(port,'127.0.0.1');
await once(server,'listening');
const probe=path=>new Promise(resolve=>http.get({host:'127.0.0.1',port,path},res=>{let b='';res.on('data',c=>b+=c);res.on('end',()=>resolve({status:res.statusCode,body:JSON.parse(b)}));}).on('error',()=>resolve({status:0})));

const baseline=await probe('/health');
version='candidate-v2'; healthy=false;
const canary=[];
for(let i=0;i<10;i++) canary.push(await probe('/canary'));
const canaryTrafficObserved=canary.length===10 && canary.every(x=>x.body?.canary===true && x.body?.version==='candidate-v2') && canaryTraffic===10;
const canaryFailureDetected=canary.some(x=>x.status!==200);
if(canaryFailureDetected){rollbackTriggered=true;version='candidate-v1';healthy=true;}
const rollback=await probe('/health');
const postRollback=[];
for(let i=0;i<10;i++) postRollback.push(await probe('/canary'));
server.close();

const checks={candidateHealthy:baseline.status===200,canaryTrafficObserved,canaryFailureDetected,rollbackTriggered,rollbackHealthy:rollback.status===200,rolledBackVersion:rollback.body?.version==='candidate-v1',postRollbackHealthy:postRollback.every(x=>x.status===200&&x.body?.version==='candidate-v1'&&x.body?.canary===true)};
const status=Object.values(checks).every(Boolean)?'PASS':'FAIL';
const report={schemaVersion:'1.2.0',status,environment:'controlled-ci-runtime',checks,release:{candidate:'candidate-v2',rollbackTarget:'candidate-v1',canaryRequests:10,postRollbackRequests:10},scope:'controlled canary/rollback drill; production deployment traffic-shifting evidence remains separately gated'};
writeFileSync('phase17-execution/release-runtime.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(status!=='PASS')process.exitCode=1;
