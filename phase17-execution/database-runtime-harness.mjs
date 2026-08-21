import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const output = `${root}/phase17-execution/database-runtime.json`;
const host = process.env.PGHOST || '127.0.0.1';
const port = process.env.PGPORT || '5432';
const user = process.env.PGUSER || 'postgres';
const database = process.env.PGDATABASE || 'phase17_test';

const result = {
  schemaVersion: '1.0.0',
  runId: randomUUID(),
  generatedAt: new Date().toISOString(),
  environment: 'github-actions-ephemeral',
  scope: 'ephemeral-database-runtime',
  status: 'FAIL',
  checks: []
};

function add(name, status, details, evidence = []) {
  result.checks.push({ name, status, details, evidence });
}

function psql(sql) {
  return execFileSync('psql', [
    '--no-psqlrc',
    '--host', host,
    '--port', String(port),
    '--username', user,
    '--dbname', database,
    '--tuples-only',
    '--no-align',
    '--command', sql
  ], { cwd: root, encoding: 'utf8', env: { ...process.env, PGPASSWORD: process.env.PGPASSWORD || 'postgres' } }).trim();
}

try {
  const serverVersion = psql('select current_setting(\'server_version\');');
  add('Database connection', 'PASS', `Connected to PostgreSQL ${serverVersion}.`, ['psql connection']);

  const schema = psql("select schema_name from information_schema.schemata where schema_name = 'public';");
  add('Schema availability', schema === 'public' ? 'PASS' : 'FAIL', 'Public schema availability checked through information_schema.', ['information_schema.schemata']);

  const table = `phase17_runtime_probe_${result.runId.replaceAll('-', '_')}`;
  const payload = `phase17-db-${result.runId}`;
  psql(`create table ${table} (id uuid primary key, payload text not null, updated_at timestamptz not null default now());`);
  psql(`insert into ${table} (id, payload) values ('${result.runId}', '${payload}');`);
  const inserted = psql(`select payload from ${table} where id = '${result.runId}';`);
  add('Controlled test data write/read', inserted === payload ? 'PASS' : 'FAIL', 'Inserted and read back a unique controlled runtime probe record.', [`${table}`]);

  psql(`update ${table} set payload = '${payload}-updated' where id = '${result.runId}';`);
  const updated = psql(`select payload from ${table} where id = '${result.runId}';`);
  add('Controlled update transaction', updated === `${payload}-updated` ? 'PASS' : 'FAIL', 'Updated the controlled probe record and verified the persisted value.', [`${table}`]);

  psql(`delete from ${table} where id = '${result.runId}';`);
  const remaining = psql(`select count(*) from ${table};`);
  psql(`drop table ${table};`);
  add('Controlled cleanup', remaining === '0' ? 'PASS' : 'FAIL', 'Deleted the probe record and removed the ephemeral probe table.', [`${table}`]);
} catch (error) {
  add('Database runtime harness execution', 'FAIL', error instanceof Error ? error.message : String(error));
}

result.status = result.checks.length > 0 && result.checks.every(check => check.status === 'PASS') ? 'PASS' : 'FAIL';
writeFileSync(output, JSON.stringify(result, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(result, null, 2));
if (result.status !== 'PASS') process.exitCode = 1;
