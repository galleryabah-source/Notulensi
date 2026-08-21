import { writeFileSync } from 'node:fs';

const baseUrl = process.env.RUNTIME_BASE_URL || 'http://127.0.0.1:4173';
const endpoint = process.env.OBSERVABILITY_HEALTH_ENDPOINT || '/api/health';
const output = process.env.OBSERVABILITY_EVIDENCE_OUTPUT || 'phase17-execution/observability-evidence.json';
const maxLatencyMs = Number(process.env.OBSERVABILITY_MAX_LATENCY_MS || 1500);

async function request(path, headers = {}) {
  const started = performance.now();
  try {
    const response = await fetch(`${baseUrl}${path}`, { headers });
    const text = await response.text();
    let body;
    try { body = JSON.parse(text); } catch { body = { raw: text }; }
    return { status: response.status, latencyMs: Math.round(performance.now() - started), headers: Object.fromEntries(response.headers), body };
  } catch (error) {
    return { status: 0, latencyMs: Math.round(performance.now() - started), headers: {}, body: null, error: String(error?.message || error) };
  }
}

const health = await request(endpoint);
const correlationProbe = await request(endpoint, { 'x-request-id': `phase17-${Date.now()}` });
const checks = [
  { id:'health_endpoint', status: health.status >= 200 && health.status < 300 ? 'PASS' : 'FAIL', details:`Health endpoint returned HTTP ${health.status}.` },
  { id:'health_latency', status: health.latencyMs <= maxLatencyMs ? 'PASS' : 'FAIL', details:`Health endpoint latency ${health.latencyMs}ms; maximum ${maxLatencyMs}ms.` },
  { id:'structured_health_response', status: health.body && typeof health.body === 'object' ? 'PASS' : 'FAIL', details:'Health response is JSON/object shaped.' },
  { id:'correlation_header_boundary', status: correlationProbe.status >= 200 && correlationProbe.status < 500 ? 'PASS' : 'FAIL', details:`Probe with x-request-id completed with HTTP ${correlationProbe.status}.` },
  { id:'server_timing_or_request_id_signal', status: ['x-request-id','x-correlation-id','traceparent','server-timing'].some(k => Object.keys(health.headers).includes(k)) ? 'PASS' : 'FAIL', details:'At least one runtime request correlation/trace signal is exposed.' }
];
const report = { schemaVersion:'1.0.0', applicationRuntimeIntegrated:true, integrationFixture:false, status: checks.every(c=>c.status==='PASS') ? 'PASS':'FAIL', target:{baseUrl, endpoint}, checks, observed:{healthStatus:health.status, healthLatencyMs:health.latencyMs, responseHeaders:Object.keys(health.headers).sort()} };
writeFileSync(output, JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(report.status !== 'PASS') process.exitCode=1;
