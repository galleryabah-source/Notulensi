import { writeFileSync } from 'node:fs';

const baseUrl = process.env.RUNTIME_BASE_URL || 'http://127.0.0.1:4173';
const path = process.env.RUNTIME_APP_PATH || '/meeting-intelligence-app-phase4.3-integrated-safe.html';
const output = process.env.RELEASE_EVIDENCE_OUTPUT || 'phase17-execution/release-canary-evidence.json';
const expectedStatus = Number(process.env.RELEASE_EXPECTED_STATUS || 200);
const maxLatencyMs = Number(process.env.RELEASE_MAX_LATENCY_MS || 1500);

async function probe(label) {
  const started = performance.now();
  try {
    const response = await fetch(`${baseUrl}${path}`, { headers: { accept: 'text/html' }, cache: 'no-store' });
    const text = await response.text();
    const latencyMs = Math.round(performance.now() - started);
    return { label, status: response.status, latencyMs, contentLength: text.length, ok: response.status === expectedStatus && latencyMs <= maxLatencyMs && text.includes('Meeting Intelligence') };
  } catch (error) {
    return { label, status: 0, latencyMs: Math.round(performance.now() - started), contentLength: 0, ok: false, error: String(error?.message || error) };
  }
}

async function main() {
  const before = await probe('canary-before');
  const canary = await probe('canary-runtime');
  const after = await probe('post-canary');
  const checks = [
    { id:'runtime_reachable', status: before.ok && canary.ok && after.ok ? 'PASS':'FAIL', details:`Probes: before=${before.status}, canary=${canary.status}, after=${after.status}.` },
    { id:'canary_latency', status: [before,canary,after].every(p => p.latencyMs <= maxLatencyMs) ? 'PASS':'FAIL', details:`Maximum observed latency: ${Math.max(before.latencyMs,canary.latencyMs,after.latencyMs)} ms.` },
    { id:'rollback_boundary', status: process.env.RELEASE_ROLLBACK_CONFIRMED === 'true' ? 'PASS':'FAIL', details:'Rollback confirmation must be supplied by the controlled deployment environment; this harness never self-declares rollback success.' }
  ];
  const report = { schemaVersion:'1.0.0', applicationRuntimeIntegrated:true, integrationFixture:false, status:checks.every(c=>c.status==='PASS')?'PASS':'FAIL', releaseStrategy:'controlled-canary', target:{baseUrl,path}, probes:[before,canary,after], checks };
  writeFileSync(output, JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
  if (report.status !== 'PASS') process.exitCode = 1;
}
await main();
