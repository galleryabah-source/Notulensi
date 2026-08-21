import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

async function read(relativePath) {
  try {
    return await readFile(path.join(root, relativePath), 'utf8');
  } catch (error) {
    failures.push(`${relativePath}: ${error.message}`);
    return '';
  }
}

const packageJson = JSON.parse(await read('package.json'));
const config = await read('server/config.mjs');
const client = await read('server/db/client.mjs');
const migrate = await read('server/db/migrate.mjs');
const index = await read('server/index.mjs');
const migration = await read('db/migrations/00421_security_authorization.sql');
const contract = await read('security/runtime-repository-contract.js');

if (packageJson.type !== 'module') failures.push('package.json must use ESM');
if (!packageJson.dependencies?.pg) failures.push('package.json must declare pg');
if (!config.includes('DATABASE_URL')) failures.push('config must expose DATABASE_URL boundary');
if (!client.includes('new Pool')) failures.push('database client must create a PostgreSQL pool');
if (!client.includes('requireDatabaseUrl')) failures.push('database client must require DATABASE_URL');
if (!migrate.includes('schema_migrations')) failures.push('migration runner must track applied migrations');
if (!migrate.includes('BEGIN')) failures.push('migration runner must be transactional');
if (!migrate.includes('ROLLBACK')) failures.push('migration runner must rollback on failure');
if (!index.includes("'/health'")) failures.push('runtime must expose /health');
if (!migration.includes('CREATE TABLE IF NOT EXISTS auth_sessions')) failures.push('security migration missing auth_sessions');
if (!migration.includes('CREATE TABLE IF NOT EXISTS authorization_audit')) failures.push('security migration missing authorization_audit');
if (!contract.includes('authorizeResourceAccess')) failures.push('Phase 4.22 repository contract must remain present');
if (config.includes('postgres://user:password')) failures.push('example credentials must not be embedded in runtime');

if (failures.length) {
  console.error('Phase 4.23 runtime self-test: FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Phase 4.23 runtime self-test: PASS');
console.log('Checks: package boundary, config, PostgreSQL pool, transactional migration runner, health endpoint, security migration, Phase 4.22 contract.');
