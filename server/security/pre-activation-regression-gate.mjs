import { spawnSync } from 'node:child_process';

const tests = [
  'server/security/protected-endpoint-contract.self-test.mjs',
  'server/security/security-integration-regression.self-test.mjs',
  'server/security/controlled-endpoint-pilot.self-test.mjs',
  'server/security/protected-route-registry.self-test.mjs',
  'server/security/security-audit-event.self-test.mjs',
];

for (const test of tests) {
  const result = spawnSync(process.execPath, [test], {
    encoding: 'utf8',
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status !== 0) {
    console.error(`Pre-activation regression gate: FAIL at ${test}`);
    process.exit(result.status ?? 1);
  }
}

console.log('Phase 4.35 pre-activation regression gate: PASS');
