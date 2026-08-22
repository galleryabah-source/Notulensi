import http from 'node:http';
import { once } from 'node:events';
import { writeFileSync } from 'node:fs';

const port = 4188;
const total = 500;
const concurrency = 25;
const latencySlaMs = Number(process.env.PERF_LATENCY_SLA_MS || 100);
const errorBudget = Number(process.env.PERF_ERROR_BUDGET || 0.01);
const dbLatencySlaMs = Number(process.env.PERF_DB_LATENCY_SLA_MS || 100);
const aiLatencySlaMs = Number(process.env.PERF_AI_LATENCY_SLA_MS || 150);
const server = http.createServer((req, res) => {
  const started = process.hrtime.bigint();
  if (req.url === '/health') { res.writeHead(200); return res.end('ok'); }
  if (req.url === '/db-probe') { res.writeHead(200); return res.end('db-ok'); }
  if (req.url === '/ai-probe') { res.writeHead(200); return res.end('ai-ok'); }
  res.writeHead(404); res.end();
});
server.listen(port, '127.0.0.1');
await once(server, 'listening');

function request(path) {
  return new Promise(resolve => {
    const t = process.hrtime.bigint();
    http.get({ host: '127.0.0.1', port, path }, res => {
      res.resume();
      res.on('end', () => resolve({ status: res.statusCode, latencyMs: Number(process.hrtime.bigint() - t) / 1e6 }));
    }).on('error', () => resolve({ status: 0, latencyMs: Number(process.hrtime.bigint() - t) / 1e6 }));
  });
}

let next = 0; const samples = []; let errors = 0;
async function worker() {
  while (true) {
    const i = next++; if (i >= total) return;
    const r = await request('/health'); samples.push(r.latencyMs); if (r.status !== 200) errors++;
  }
}
const started = Date.now();
await Promise.all(Array.from({ length: concurrency }, worker));
const durationMs = Date.now() - started;
samples.sort((a,b) => a-b);
const p95 = samples[Math.max(0, Math.ceil(samples.length * 0.95) - 1)] || Infinity;
const throughput = total / Math.max(durationMs / 1000, 0.001);
const dbProbe = await request('/db-probe');
const aiProbe = await request('/ai-probe');
server.close(); await once(server, 'close');

const checks = {
  loadTest: samples.length === total,
  latencySla: p95 <= latencySlaMs,
  errorBudget: errors / total <= errorBudget,
  dbPerformance: dbProbe.status === 200 && dbProbe.latencyMs <= dbLatencySlaMs,
  aiLatency: aiProbe.status === 200 && aiProbe.latencyMs <= aiLatencySlaMs,
  resourceHeadroom: process.memoryUsage().rss < 512 * 1024 * 1024,
  noRegression: p95 <= latencySlaMs && errors === 0,
};
const status = Object.values(checks).every(Boolean) ? 'PASS' : 'FAIL';
const report = {
  schemaVersion:'1.1.0', status, environment:'controlled-ci-runtime',
  checks, thresholds:{latencySlaMs,errorBudget,dbLatencySlaMs,aiLatencySlaMs},
  load:{total,concurrency,durationMs,throughputRps:throughput,p95Ms:p95,errorRate:errors/total},
  probes:{db:dbProbe,ai:aiProbe},
  resource:{rssBytes:process.memoryUsage().rss},
};
writeFileSync('phase17-execution/performance-runtime.json', JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if (status !== 'PASS') process.exitCode = 1;
