const forbidden = [
  'controlled-test-provider','controlled-test-model','phase17-test-issuer','phase17-test-audience',
  'DO-NOT-USE-IN-PRODUCTION','localhost','127.0.0.1','development-secret','test-secret'
];
const requiredInProduction = ['NODE_ENV'];
const values = Object.entries(process.env).filter(([key]) => /^(NODE_ENV|AI_PROVIDER|AI_MODEL|AUTH_ISSUER|AUTH_AUDIENCE|DATABASE_URL|GEMINI_API_KEY|VERCEL_ENV|VERCEL_URL)$/.test(key));
const text = values.map(([key,value]) => `${key}=${value || ''}`).join('\n').toLowerCase();
const errors=[];
const production = process.env.NODE_ENV==='production' || process.env.PRODUCTION_CONFIG_CHECK==='true';
if (production) {
  for (const key of requiredInProduction) if (!process.env[key]) errors.push(`missing required production variable: ${key}`);
  if (process.env.AI_PROVIDER === 'controlled-test-provider') errors.push('AI_PROVIDER uses controlled-test-provider');
  if (process.env.AI_MODEL === 'controlled-test-model-v1') errors.push('AI_MODEL uses controlled-test-model-v1');
  if (!process.env.DATABASE_URL) errors.push('DATABASE_URL is missing');
  if (!process.env.GEMINI_API_KEY && process.env.AI_PROVIDER === 'gemini') errors.push('GEMINI_API_KEY is missing while AI_PROVIDER=gemini');
}
for (const marker of forbidden) if (text.includes(marker.toLowerCase())) errors.push(`forbidden production marker detected: ${marker}`);
const report={schemaVersion:'1.0.0',check:'production-configuration-safety',environment:production?'production':'controlled-ci',status:errors.length?'FAIL':'PASS',checkedAt:new Date().toISOString(),checks:{forbiddenMarkers:errors.filter(e=>e.includes('forbidden')).length===0,productionRequirements:production?errors.every(e=>!e.includes('missing required')):true},errors};
console.log(JSON.stringify(report,null,2));
if(errors.length)process.exitCode=1;
