import http from 'node:http';
import crypto from 'node:crypto';
import pg from 'pg';
import jwt from 'jsonwebtoken';

const { Pool } = pg;
const port = Number(process.env.R2_4_PORT || 4184);
const secret = process.env.JWT_SECRET;
const issuer = process.env.AUTH_ISSUER;
const audience = process.env.AUTH_AUDIENCE;
const databaseUrl = process.env.DATABASE_URL;
const provider = process.env.AI_PROVIDER || 'controlled-test-provider';
const model = process.env.AI_MODEL || 'controlled-test-model-v1';
const inputRate = Number(process.env.AI_INPUT_RATE || 0.000001);
const outputRate = Number(process.env.AI_OUTPUT_RATE || 0.000002);
const quotaTokens = Number(process.env.AI_QUOTA_TOKENS || 1000);
const budgetAlertUsd = Number(process.env.AI_BUDGET_ALERT_USD || 0.000003);
if (!secret || !databaseUrl) throw new Error('R2.4 runtime configuration missing');

const pool = new Pool({ connectionString: databaseUrl });
const schema = `
CREATE TABLE IF NOT EXISTS r2_4_ai_usage (
  id BIGSERIAL PRIMARY KEY,
  identity_id UUID NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  cost_usd NUMERIC(18,9) NOT NULL,
  prompt_hash TEXT NOT NULL,
  prompt_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS r2_4_ai_budget_alerts (
  id BIGSERIAL PRIMARY KEY,
  identity_id UUID NOT NULL,
  usage_usd NUMERIC(18,9) NOT NULL,
  threshold_usd NUMERIC(18,9) NOT NULL,
  alerted BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
`;
await pool.query(schema);
await pool.query('ALTER TABLE r2_4_ai_usage ADD COLUMN IF NOT EXISTS prompt_text TEXT');
await pool.query('DELETE FROM r2_4_ai_usage');
await pool.query('DELETE FROM r2_4_ai_budget_alerts');

function json(res, status, value) { res.writeHead(status, {'content-type':'application/json'}); res.end(JSON.stringify(value)); }
function auth(req) {
  const raw = req.headers.authorization || '';
  if (!raw.startsWith('Bearer ')) return null;
  try { return jwt.verify(raw.slice(7), secret, { algorithms:['HS256'], issuer, audience }); } catch { return null; }
}
async function body(req) {
  let text = ''; for await (const chunk of req) text += chunk;
  return text ? JSON.parse(text) : {};
}
function cost(inputTokens, outputTokens) { return inputTokens * inputRate + outputTokens * outputRate; }
function tokenCount(text) { return Math.max(1, String(text || '').trim().split(/\s+/).filter(Boolean).length); }

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/health') return json(res, 200, {ok:true, provider, model});
    if (req.method !== 'POST' || req.url !== '/api/ai/generate') return json(res, 404, {error:'not_found'});
    const claims = auth(req);
    if (!claims?.sub) return json(res, 401, {error:'unauthorized'});
    const input = await body(req);
    const prompt = String(input.prompt || '');
    const requestedOutputTokens = Number(input.outputTokens || 2);
    const inputTokens = tokenCount(prompt);
    if (inputTokens > 200 || requestedOutputTokens > 100) return json(res, 429, {error:'anomaly_detected'});
    const previous = await pool.query('SELECT COALESCE(SUM(input_tokens + output_tokens),0)::int AS tokens, COALESCE(SUM(cost_usd),0)::numeric AS cost FROM r2_4_ai_usage WHERE identity_id=$1',[claims.sub]);
    const usedTokens = Number(previous.rows[0].tokens || 0);
    if (usedTokens + inputTokens + requestedOutputTokens > quotaTokens) return json(res, 429, {error:'quota_exceeded', quotaTokens, usedTokens});
    const outputTokens = requestedOutputTokens;
    const usageCost = cost(inputTokens, outputTokens);
    const promptHash = crypto.createHash('sha256').update(prompt).digest('hex');
    const result = await pool.query(`INSERT INTO r2_4_ai_usage(identity_id,provider,model,input_tokens,output_tokens,cost_usd,prompt_hash,prompt_text) VALUES($1,$2,$3,$4,$5,$6,$7,NULL) RETURNING id,identity_id,provider,model,input_tokens,output_tokens,cost_usd,prompt_hash`,[claims.sub,provider,model,inputTokens,outputTokens,usageCost,promptHash]);
    const totalCost = Number(previous.rows[0].cost || 0) + usageCost;
    const alerted = totalCost >= budgetAlertUsd;
    await pool.query('INSERT INTO r2_4_ai_budget_alerts(identity_id,usage_usd,threshold_usd,alerted) VALUES($1,$2,$3,$4)',[claims.sub,totalCost,budgetAlertUsd,alerted]);
    return json(res, 200, {ok:true, provider, model, usage:result.rows[0], costModel:{inputRate,outputRate,calculatedCost:usageCost}, budget:{totalCost,thresholdUsd:budgetAlertUsd,alerted}, promptRetained:false});
  } catch (error) { return json(res, 500, {error:'runtime_error',message:error.message}); }
});
server.listen(port, '127.0.0.1');
process.on('SIGTERM', async () => { server.close(); await pool.end(); process.exit(0); });
