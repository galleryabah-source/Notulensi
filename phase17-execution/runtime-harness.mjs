import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const root = process.cwd();
const output = process.env.RUNTIME_EVIDENCE_OUTPUT || `${root}/phase17-execution/runtime-evidence.json`;
const baseUrl = process.env.RUNTIME_BASE_URL || 'http://127.0.0.1:4173';
const appPath = process.env.RUNTIME_APP_PATH || '/meeting-intelligence-app-phase4.3-integrated-safe.html';

function run(command, args, options = {}) {
  return execFileSync(command, args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...options }).trim();
}

function checkHttpHealth() {
  const url = `${baseUrl}${appPath}`;
  try {
    const headers = run('curl', ['-fsS', '-D', '-', '-o', '/tmp/phase17-app.html', '--max-time', '10', url]);
    const body = readFileSync('/tmp/phase17-app.html', 'utf8');
    const statusLine = headers.split(/\r?\n/, 1)[0] || '';
    const status = /\s200\s/.test(`${statusLine} `) ? 'PASS' : 'FAIL';
    const hasExpectedTitle = /Meeting Intelligence Ultimate/i.test(body);
    const finalStatus = status === 'PASS' && hasExpectedTitle ? 'PASS' : 'FAIL';
    return {
      id: '17-E.runtime.health',
      phase: 'runtime',
      name: 'Application HTTP health',
      status: finalStatus,
      evidence: [url, 'HTTP 200 response', 'Expected application title present'],
      details: `Served application returned ${statusLine}; titleCheck=${hasExpectedTitle}.`
    };
  } catch (error) {
    return {
      id: '17-E.runtime.health',
      phase: 'runtime',
      name: 'Application HTTP health',
      status: 'FAIL',
      evidence: [url],
      details: `Application health check failed: ${error.message}`
    };
  }
}

function checkDatabase() {
  const required = ['PGHOST', 'PGPORT', 'PGUSER', 'PGPASSWORD', 'PGDATABASE'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    return {
      id: '17-E.runtime.database',
      phase: 'database',
      name: 'PostgreSQL runtime behavior',
      status: 'NOT_RUN',
      evidence: [],
      details: `Database harness skipped because environment variables are missing: ${missing.join(', ')}.`
    };
  }

  const schema = 'phase17_e10_runtime';
  const token = randomUUID().replaceAll('-', '');
  const value = `runtime-${token}`;
  const sql = [
    `CREATE SCHEMA IF NOT EXISTS ${schema};`,
    `CREATE TABLE IF NOT EXISTS ${schema}.probe (id BIGSERIAL PRIMARY KEY, token TEXT NOT NULL UNIQUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());`,
    `INSERT INTO ${schema}.probe (token) VALUES ('${value}');`,
    `SELECT token FROM ${schema}.probe WHERE token = '${value}';`,
    `BEGIN; INSERT INTO ${schema}.probe (token) VALUES ('rollback-${token}'); ROLLBACK;`,
    `SELECT COUNT(*) FROM ${schema}.probe WHERE token = 'rollback-${token}';`,
    `DROP SCHEMA ${schema} CASCADE;`
  ].join(' ');

  try {
    const result = run('psql', ['-v', 'ON_ERROR_STOP=1', '-Atqc', sql]);
    const lines = result.split(/\r?\n/).filter(Boolean);
    const selected = lines.some((line) => line === value);
    const rollbackCount = lines.at(-1) === '0';
    const finalStatus = selected && rollbackCount ? 'PASS' : 'FAIL';
    return {
      id: '17-E.runtime.database',
      phase: 'database',
      name: 'PostgreSQL runtime behavior',
      status: finalStatus,
      evidence: ['PostgreSQL service', 'CREATE/INSERT/SELECT', 'transaction rollback', 'schema cleanup'],
      details: `Isolated PostgreSQL probe selected=${selected}; rollbackCountZero=${rollbackCount}.`
    };
  } catch (error) {
    return {
      id: '17-E.runtime.database',
      phase: 'database',
      name: 'PostgreSQL runtime behavior',
      status: 'FAIL',
      evidence: ['PostgreSQL service'],
      details: `PostgreSQL runtime probe failed: ${error.message}`
    };
  }
}

const checks = [checkHttpHealth(), checkDatabase()];
const report = {
  schemaVersion: '1.0.0',
  harness: '17-E.10 Runtime Harness Foundation',
  generatedAt: new Date().toISOString(),
  commit: run('git', ['rev-parse', 'HEAD']),
  checks
};
writeFileSync(output, JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(report, null, 2));
if (checks.some((check) => check.status !== 'PASS')) process.exitCode = 1;
