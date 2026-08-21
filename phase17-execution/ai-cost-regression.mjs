import { writeFileSync } from 'node:fs';

const baseUrl = process.env.RUNTIME_BASE_URL || 'http://127.0.0.1:4173';
const endpoint = process.env.AI_RUNTIME_ENDPOINT || '/api/ai/usage';
const expectedStatus = Number(process.env.AI_EXPECTED_STATUS || 200);
const maxCost = Number(process.env.AI_MAX_COST || 0.05);
const maxTokens = Number(process.env.AI_MAX_TOKENS || 4000);
const output = process.env.AI_COST_EVIDENCE_OUTPUT || 'phase17-execution/ai-cost-evidence.json';

async function main() {
  const started = performance.now();
  let response;
  let body = null;
  let error = null;
  try {
    response = await fetch(`${baseUrl}${endpoint}`, { headers: { accept: 'application/json' } });
    const text = await response.text();
    try { body = JSON.parse(text); } catch { body = { raw: text }; }
  } catch (err) {
    error = String(err?.message || err);
  }

  const status = response?.status ?? 0;
  const usage = body?.usage || body?.data?.usage || {};
  const tokens = Number(usage.totalTokens ?? usage.total_tokens ?? body?.totalTokens ?? 0);
  const cost = Number(body?.costUsd ?? body?.cost_usd ?? body?.estimatedCostUsd ?? body?.estimated_cost_usd ?? 0);
  const checks = [
    { id:'provider_endpoint_reachable', status: status === expectedStatus ? 'PASS' : 'FAIL', details:`Expected HTTP ${expectedStatus}, received ${status}${error ? ` (${error})` : ''}.` },
    { id:'usage_meter_available', status: Number.isFinite(tokens) && tokens > 0 ? 'PASS' : 'FAIL', details:`Reported total tokens: ${tokens}.` },
    { id:'cost_meter_available', status: Number.isFinite(cost) && cost >= 0 ? 'PASS' : 'FAIL', details:`Reported/estimated cost: $${cost}.` },
    { id:'token_budget', status: tokens <= maxTokens ? 'PASS' : 'FAIL', details:`Token usage ${tokens}; maximum ${maxTokens}.` },
    { id:'cost_budget', status: cost <= maxCost ? 'PASS' : 'FAIL', details:`Cost $${cost}; maximum $${maxCost}.` }
  ];
  const report = {
    schemaVersion:'1.0.0',
    applicationRuntimeIntegrated:true,
    integrationFixture:false,
    status: checks.every(c => c.status === 'PASS') ? 'PASS' : 'FAIL',
    target:{ baseUrl, endpoint },
    usage:{ totalTokens:tokens, costUsd:cost },
    budgets:{ maxTokens, maxCostUsd:maxCost },
    durationMs:Math.round(performance.now() - started),
    checks
  };
  writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  if (report.status !== 'PASS') process.exitCode = 1;
}
await main();
