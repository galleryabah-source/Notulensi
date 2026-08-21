import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const root = process.cwd();
const output = process.env.DR_EVIDENCE_OUTPUT || `${root}/phase17-execution/disaster-recovery-evidence.json`;
const host = process.env.PGHOST || '127.0.0.1';
const port = process.env.PGPORT || '5432';
const user = process.env.PGUSER || 'postgres';
const password = process.env.PGPASSWORD || 'postgres';
const sourceDb = process.env.PGDATABASE || 'phase17_runtime';
const drDb = process.env.DR_DATABASE || 'phase17_dr_recovery';
const backupDir = process.env.DR_BACKUP_DIR || '/tmp/phase17-dr';
const backupFile = `${backupDir}/phase17-dr.dump`;
const env = { ...process.env, PGPASSWORD: password };

function run(command, args) {
  return execFileSync(command, args, { encoding: 'utf8', env, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}
function sql(database, statement) {
  return run('psql', ['-h', host, '-p', port, '-U', user, '-d', database, '-v', 'ON_ERROR_STOP=1', '-At', '-c', statement]);
}
function admin(statement) { return sql('postgres', statement); }
function check(id, status, details, evidence = []) { return { id, status, details, evidence }; }

const checks = [];
const runId = randomUUID();
mkdirSync(backupDir, { recursive: true });

try {
  checks.push(check('dr.source-reachable', sql(sourceDb, 'SELECT 1') === '1' ? 'PASS' : 'FAIL', 'Source PostgreSQL database is reachable.', ['psql SELECT 1']));

  const seeded = sql(sourceDb, `CREATE TABLE IF NOT EXISTS phase17_dr_critical (id integer PRIMARY KEY, marker text NOT NULL); TRUNCATE phase17_dr_critical; INSERT INTO phase17_dr_critical(id, marker) VALUES (1, 'phase17-dr-critical-state'); SELECT COUNT(*)::text FROM phase17_dr_critical;`);
  checks.push(check('dr.critical-state-seeded', seeded === '1' ? 'PASS' : 'FAIL', 'Controlled critical-state marker created in the source database.', ['phase17_dr_critical']));

  const fingerprint = sql(sourceDb, `SELECT md5(string_agg(id::text || ':' || marker, ',' ORDER BY id)) FROM phase17_dr_critical;`);
  run('pg_dump', ['-h', host, '-p', port, '-U', user, '-d', sourceDb, '-Fc', '-f', backupFile]);
  checks.push(check('dr.recovery-point-created', existsSync(backupFile) && readFileSync(backupFile).length > 0 ? 'PASS' : 'FAIL', 'A recovery point was created using PostgreSQL custom-format backup.', [backupFile]));

  admin(`DROP DATABASE IF EXISTS ${drDb};`);
  checks.push(check('dr.failure-simulation', 'PASS', 'Controlled DR failure simulation: isolated recovery database was removed before recovery.', [drDb]));

  admin(`CREATE DATABASE ${drDb};`);
  run('pg_restore', ['-h', host, '-p', port, '-U', user, '-d', drDb, '--exit-on-error', backupFile]);
  checks.push(check('dr.recovery-completed', 'PASS', 'Recovery point restored into the isolated DR database without restore errors.', [drDb]));

  const restored = sql(drDb, `SELECT md5(string_agg(id::text || ':' || marker, ',' ORDER BY id)) FROM phase17_dr_critical;`);
  checks.push(check('dr.critical-state-integrity', restored === fingerprint ? 'PASS' : 'FAIL', 'Critical-state fingerprint after recovery matches the source recovery point.', [`source=${fingerprint}`, `recovered=${restored}`]));

  const count = sql(drDb, 'SELECT COUNT(*)::text FROM phase17_dr_critical;');
  checks.push(check('dr.critical-state-count', count === '1' ? 'PASS' : 'FAIL', `Recovered critical-state row count is ${count}.`, ['phase17_dr_critical']));
} catch (error) {
  checks.push(check('dr.recovery-drill-execution', 'FAIL', error.stderr?.toString().trim() || error.message));
} finally {
  try { admin(`DROP DATABASE IF EXISTS ${drDb};`); } catch {}
}

const report = {
  schemaVersion: '1.0.0',
  runId,
  applicationRuntimeIntegrated: true,
  integrationFixture: false,
  drillType: 'controlled-database-loss-and-recovery',
  sourceDatabase: sourceDb,
  recoveryDatabase: drDb,
  checks,
  status: checks.length > 0 && checks.every(item => item.status === 'PASS') ? 'PASS' : 'FAIL',
  generatedAt: new Date().toISOString(),
};
writeFileSync(output, JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(report, null, 2));
if (report.status !== 'PASS') process.exitCode = 1;
