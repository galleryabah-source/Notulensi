import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

const port = Number(process.env.OBSERVABILITY_PORT || 4185);
const logs = [];
const metrics = { requests_total: 0, requests_success_total: 0, requests_error_total: 0 };
let server;
function emit(level, event, fields = {}) { logs.push({ timestamp: new Date().toISOString(), level, event, ...fields }); }
function json(res, status, body, correlationId) { res.writeHead(status, {'content-type':'application/json','x-correlation-id':correlationId}); res.end(JSON.stringify(body)); }
server = http.createServer((req,res) => {
  const correlationId = req.headers['x-correlation-id'] || randomUUID();
  metrics.requests_total += 1;
  emit('info','request.started',{correlationId,method:req.method,path:req.url});
  if (req.url === '/health') {
    metrics.requests_success_total += 1;
    emit('info','request.completed',{correlationId,status:200});
    return json(res,200,{ok:true,correlationId},correlationId);
  }
  metrics.requests_error_total += 1;
  emit('warn','request.completed',{correlationId,status:404});
  return json(res,404,{error:'not_found',correlationId},correlationId);
});
server.listen(port,'127.0.0.1');
await once(server,'listening');
const request = (path, correlationId) => new Promise((resolve,reject) => {
  const req = http.request({host:'127.0.0.1',port,path,headers:{'x-correlation-id':correlationId}},res => { let b=''; res.on('data',c=>b+=c); res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:JSON.parse(b)})); });
  req.on('error',reject); req.end();
});
const cid = `obs-${randomUUID()}`;
const ok = await request('/health',cid);
const bad = await request('/missing',cid);
server.close(); await once(server,'close');
const correlated = logs.filter(x=>x.correlationId===cid).length >= 4;
const structured = logs.every(x=>x.timestamp && x.level && x.event);
const metricsValid = metrics.requests_total===2 && metrics.requests_success_total===1 && metrics.requests_error_total===1;
const status = ok.status===200 && bad.status===404 && ok.body.correlationId===cid && bad.body.correlationId===cid && correlated && structured && metricsValid ? 'PASS' : 'FAIL';
const report = {schemaVersion:'1.0.0',status,checks:{structuredLogs:structured,correlationId:correlated,metrics:metricsValid,errorTelemetry:bad.status===404},metrics,logSample:logs.slice(0,8)};
await import('node:fs/promises').then(fs=>fs.writeFile('phase17-execution/observability-runtime.json',JSON.stringify(report,null,2)+'\n'));
console.log(JSON.stringify(report,null,2));
if(status!=='PASS') process.exitCode=1;
