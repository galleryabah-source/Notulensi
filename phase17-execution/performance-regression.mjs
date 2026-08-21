import { writeFileSync } from 'node:fs';

const baseUrl = process.env.RUNTIME_BASE_URL || 'http://127.0.0.1:4173';
const path = process.env.RUNTIME_APP_PATH || '/meeting-intelligence-app-phase4.3-integrated-safe.html';
const requests = Number(process.env.PERFORMANCE_REQUESTS || 40);
const concurrency = Number(process.env.PERFORMANCE_CONCURRENCY || 5);
const maxP95Ms = Number(process.env.PERFORMANCE_P95_MAX_MS || 1500);
const maxErrorRate = Number(process.env.PERFORMANCE_MAX_ERROR_RATE || 0);

const latencies = [];
let errors = 0;
let next = 0;

async function one() {
  const started = performance.now();
  try {
    const response = await fetch(`${baseUrl}${path}`, { redirect: 'manual' });
    const elapsed = performance.now() - started;
    latencies.push(elapsed);
    if (response.status !== 200) errors++;
  } catch {
    latencies.push(performance.now() - started);
    errors++;
  }
}

async function worker() {
  while (true) {
    const index = next++;
    if (index >= requests) return;
    await one();
  }
}

await Promise.all(Array.from({ length: Math.min(concurrency, requests) }, worker));
latencies.sort((a,b) => a-b);
const percentile = (p) => latencies[Math.min(latencies.length - 1, Math.ceil(p * latencies.length) - 1)] ?? Infinity;
const p95 = percentile(0.95);
const errorRate = requests ? errors / requests : 1;
const checks = [
  { id:'requests_completed', status:latencies.length === requests ? 'PASS' : 'FAIL', details:`Completed ${latencies.length}/${requests} requests.` },
  { id:'error_rate', status:errorRate <= maxErrorRate ? 'PASS' : 'FAIL', details:`Error rate ${errorRate}; maximum ${maxErrorRate}.` },
  { id:'p95_latency', status:p95 <= maxP95Ms ? 'PASS' : 'FAIL', details:`P95 ${Math.round(p95)}ms; maximum ${maxP95Ms}ms.` }
];
const report = { schemaVersion:'1.0.0', applicationRuntimeIntegrated:true, integrationFixture:false, status:checks.every(c=>c.status==='PASS')?'PASS':'FAIL', target:{baseUrl,path}, workload:{requests,concurrency}, checks, summary:{p95Ms:Math.round(p95),errorRate} };
const output = process.env.PERFORMANCE_REGRESSION_EVIDENCE_OUTPUT || 'phase17-execution/performance-regression-evidence.json';
writeFileSync(output, JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if (report.status !== 'PASS') process.exitCode = 1;
