import { writeFileSync } from 'node:fs';

const checks = [];
const check = (id, name, status, details = '', evidence = []) => checks.push({ id, name, status, details, evidence });

const requiredEnv = [
  'DATABASE_URL',
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD_HASH',
  'ADMIN_PASSWORD_SALT',
  'ADMIN_SESSION_SECRET',
  'GEMINI_API_KEY',
];

for (const key of requiredEnv) {
  const configured = Boolean(String(process.env[key] || '').trim());
  check(`production.env.${key}`, `Production environment ${key}`, configured ? 'PASS' : 'FAIL', configured ? 'Configured.' : 'Missing required production environment variable.', [key]);
}

const nodeVersion = Number(process.versions.node.split('.')[0]);
check('production.runtime.node', 'Supported Node.js runtime', nodeVersion >= 20 ? 'PASS' : 'FAIL', `Node.js ${process.versions.node}`, ['process.versions.node']);

const result = {
  schemaVersion: '1.0.0',
  scope: 'production-preflight',
  decision: checks.every((c) => c.status === 'PASS') ? 'PASS' : 'FAIL',
  failClosed: true,
  generatedAt: new Date().toISOString(),
  checks,
};

const output = process.env.PRODUCTION_PREFLIGHT_OUTPUT || 'phase17-execution/production-preflight.json';
writeFileSync(output, JSON.stringify(result, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(result, null, 2));
if (result.decision !== 'PASS') process.exitCode = 1;
