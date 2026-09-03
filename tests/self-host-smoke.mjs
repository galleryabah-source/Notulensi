import { spawn } from 'node:child_process';
import http from 'node:http';

const port = 3197;
const child = spawn(process.execPath, ['server/self-host.mjs'], {
  env: { ...process.env, NOTULENSI_HOST: '127.0.0.1', NOTULENSI_PORT: String(port), DATABASE_URL: '' },
  stdio: ['ignore', 'pipe', 'pipe']
});

let output = '';
child.stdout.on('data', (chunk) => { output += chunk.toString(); });
child.stderr.on('data', (chunk) => { output += chunk.toString(); });

function request(path) {
  return new Promise((resolve, reject) => {
    const req = http.get({ host: '127.0.0.1', port, path }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('error', reject);
    req.setTimeout(3000, () => req.destroy(new Error('timeout')));
  });
}

try {
  let ready = false;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      await request('/health');
      ready = true;
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  if (!ready) throw new Error(`Server did not start.\n${output}`);

  const health = await request('/health');
  if (health.status !== 200) throw new Error(`Health check failed: ${health.status} ${health.body}`);
  const index = await request('/');
  if (index.status !== 200 || !index.body.includes('Notulensi')) throw new Error('Homepage did not return the expected Notulensi document.');
  const missingApi = await request('/api/does-not-exist');
  if (missingApi.status !== 404) throw new Error(`Unknown API route should return 404, got ${missingApi.status}.`);

  console.log('PASS — self-host runtime smoke test');
} finally {
  child.kill('SIGTERM');
  await new Promise((resolve) => child.once('exit', resolve));
}
