import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const base = process.env.AUTH_INTEGRATION_BASE_URL || 'http://127.0.0.1:4180';
const output = process.env.AUTH_RUNTIME_EVIDENCE_OUTPUT || `${process.cwd()}/phase17-execution/auth-runtime-evidence.json`;

function request(path, options = {}) {
  const args = ['-sS', '-i', '--max-time', '10', '-X', options.method || 'GET'];
  if (options.cookie) args.push('-H', `Cookie: ${options.cookie}`);
  if (options.body !== undefined) args.push('-H', 'Content-Type: application/json', '--data', JSON.stringify(options.body));
  args.push(`${base}${path}`);
  const raw = execFileSync('curl', args, { encoding: 'utf8' });
  const split = raw.split(/\r?\n\r?\n/);
  const headers = split.shift() || '';
  const body = split.join('\n\n');
  const statusMatch = headers.match(/HTTP\/\d(?:\.\d)?\s+(\d+)/);
  const status = Number(statusMatch?.[1] || 0);
  const cookie = (headers.match(/^set-cookie:\s*([^;]+)/im) || [])[1] || '';
  return { status, headers, body, cookie, json: body ? JSON.parse(body) : {} };
}
function check(name, passed, details) { return { name, status: passed ? 'PASS' : 'FAIL', details }; }

const checks = [];
try {
  const unauth = request('/api/auth/me');
  checks.push(check('Unauthenticated access rejected', unauth.status === 401, `status=${unauth.status}`));

  const invalid = request('/api/auth/login', { method: 'POST', body: { username: 'admin', password: 'wrong-password' } });
  checks.push(check('Invalid credentials rejected', invalid.status === 401, `status=${invalid.status}`));

  const login = request('/api/auth/login', { method: 'POST', body: { username: 'admin', password: 'phase17-admin-password' } });
  checks.push(check('Valid authentication accepted', login.status === 200 && Boolean(login.cookie), `status=${login.status}; sessionCookie=${Boolean(login.cookie)}`));
  const adminCookie = login.cookie;

  const me = request('/api/auth/me', { cookie: adminCookie });
  checks.push(check('Authenticated session recognized', me.status === 200 && me.json?.user?.role === 'ADMIN', `status=${me.status}; role=${me.json?.user?.role}`));

  const adminArea = request('/api/protected/admin', { cookie: adminCookie });
  checks.push(check('ADMIN authorization accepted', adminArea.status === 200, `status=${adminArea.status}`));

  const operatorLogin = request('/api/auth/login', { method: 'POST', body: { username: 'operator', password: 'phase17-operator-password' } });
  const operatorCookie = operatorLogin.cookie;
  const operatorAdmin = request('/api/protected/admin', { cookie: operatorCookie });
  checks.push(check('Privilege escalation denied', operatorLogin.status === 200 && operatorAdmin.status === 403, `login=${operatorLogin.status}; admin=${operatorAdmin.status}`));

  const ownerA = request('/api/protected/owner-a', { cookie: operatorCookie });
  checks.push(check('Owner-scoped access allowed', ownerA.status === 200, `status=${ownerA.status}`));

  const logout = request('/api/auth/logout', { method: 'POST', cookie: adminCookie });
  const afterLogout = request('/api/auth/me', { cookie: adminCookie });
  checks.push(check('Session revocation enforced', logout.status === 200 && afterLogout.status === 401, `logout=${logout.status}; afterLogout=${afterLogout.status}`));
} catch (error) {
  checks.push(check('Harness execution', false, error.message));
}

const passed = checks.every((item) => item.status === 'PASS');
const report = {
  schemaVersion: '1.0.0',
  checkId: '17-E.runtime.auth.integration',
  phase: '17-E.11-B',
  name: 'Executable authentication/RBAC integration boundary harness',
  status: passed ? 'PASS' : 'FAIL',
  applicationRuntimeIntegrated: false,
  integrationFixture: true,
  generatedAt: new Date().toISOString(),
  checks,
  details: 'This is an isolated CI integration fixture. It must not be treated as application-runtime authentication evidence until the real application server delegates to the same boundary and the fixture flag is removed.'
};
writeFileSync(output, JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(report, null, 2));
if (!passed) process.exitCode = 1;
