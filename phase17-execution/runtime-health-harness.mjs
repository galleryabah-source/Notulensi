import { existsSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const root = process.cwd();
const output = `${root}/phase17-execution/runtime-health.json`;
const target = 'meeting-intelligence-app-phase4.6.3-runtime-validation.html';
const targetScript = 'phase4.6.3-runtime-validation.js';
const port = Number(process.env.RUNTIME_PORT || 4173);
const url = `http://127.0.0.1:${port}/${target}`;

const result = {
  schemaVersion: '1.0.0',
  runId: randomUUID(),
  generatedAt: new Date().toISOString(),
  environment: 'github-actions-ephemeral',
  target,
  status: 'FAIL',
  checks: []
};

function add(name, status, details, evidence = []) {
  result.checks.push({ name, status, details, evidence });
}

let server;
try {
  if (!existsSync(target)) {
    add('Application entrypoint exists', 'FAIL', `Missing ${target}`);
  } else if (!existsSync(targetScript)) {
    add('Runtime validation script exists', 'FAIL', `Missing ${targetScript}`);
  } else {
    server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], {
      cwd: root,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let ready = false;
    for (let attempt = 0; attempt < 30; attempt += 1) {
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(1000) });
        if (response.ok) {
          const html = await response.text();
          add('HTTP application runtime', 'PASS', `HTTP ${response.status}; ${html.length} bytes served.`, [url]);
          add('Runtime validation page content', html.includes('Phase 4.6.3') ? 'PASS' : 'FAIL', 'Expected Phase 4.6.3 marker checked in served HTML.', [target]);
          add('Runtime validation script reachable', html.includes(targetScript) ? 'PASS' : 'FAIL', `Script reference ${targetScript} checked in served HTML.`, [targetScript]);
          ready = true;
          break;
        }
      } catch {}
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    if (!ready) add('HTTP application runtime', 'FAIL', 'Application did not become reachable within the readiness window.', [url]);
  }
} catch (error) {
  add('Runtime harness execution', 'FAIL', error instanceof Error ? error.message : String(error));
} finally {
  if (server) server.kill('SIGTERM');
}

result.status = result.checks.length > 0 && result.checks.every(check => check.status === 'PASS') ? 'PASS' : 'FAIL';
writeFileSync(output, JSON.stringify(result, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(result, null, 2));
if (result.status !== 'PASS') process.exitCode = 1;
