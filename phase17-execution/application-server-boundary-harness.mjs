import http from 'node:http';

const baseUrl = process.env.APPLICATION_SERVER_BASE_URL || 'http://127.0.0.1:4190';
const ttlMs = Number(process.env.APPLICATION_SESSION_TTL_MS || 300000);

function request(method, path, body, cookie) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const payload = body === undefined ? null : JSON.stringify(body);
    const req = http.request(url, { method, headers: { ...(payload ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) } : {}), ...(cookie ? { cookie } : {}) } }, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data ? JSON.parse(data) : {} }));
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function assert(checks, id, expected, actual, detail) {
  const ok = expected === actual;
  checks.push({ id, status: ok ? 'PASS' : 'FAIL', expected, actual, detail });
  return ok;
}

const checks = [];
try {
  let result = await request('GET', '/api/auth/me');
  assert(checks, '17-E.auth.unauthenticated', 401, result.status, 'Unauthenticated session must be rejected.');

  result = await request('POST', '/api/auth/login', { username: 'viewer-a', password: 'wrong' });
  assert(checks, '17-E.auth.invalid_credentials', 401, result.status, 'Invalid credentials must be rejected.');

  result = await request('POST', '/api/auth/login', { username: 'viewer-a', password: 'phase17-viewer-password' });
  const loginPass = assert(checks, '17-E.auth.login', 200, result.status, 'Valid credentials must establish a session.');
  const cookie = result.headers['set-cookie']?.[0]?.split(';', 1)[0];

  result = await request('GET', '/api/auth/me', undefined, cookie);
  assert(checks, '17-E.auth.session', 200, result.status, 'Authenticated session must be recognized.');

  result = await request('GET', '/api/protected/admin', undefined, cookie);
  assert(checks, '17-E.auth.rbac.viewer_denied', 403, result.status, 'Viewer must not access ADMIN area.');

  result = await request('GET', '/api/protected/owners/owner-a', undefined, cookie);
  assert(checks, '17-E.auth.owner_allowed', 200, result.status, 'Owner-scoped resource must be accessible to matching owner.');

  result = await request('GET', '/api/protected/owners/owner-b', undefined, cookie);
  assert(checks, '17-E.auth.cross_owner_denied', 403, result.status, 'Cross-owner resource access must be denied.');

  if (loginPass && ttlMs <= 5000) {
    await new Promise(resolve => setTimeout(resolve, ttlMs + 150));
    result = await request('GET', '/api/auth/me', undefined, cookie);
    assert(checks, '17-E.auth.expiry', 401, result.status, 'Expired sessions must be rejected.');
  }

  result = await request('POST', '/api/auth/login', { username: 'admin', password: 'phase17-admin-password' });
  const adminCookie = result.headers['set-cookie']?.[0]?.split(';', 1)[0];
  assert(checks, '17-E.auth.admin_login', 200, result.status, 'ADMIN authentication must succeed.');
  result = await request('GET', '/api/protected/admin', undefined, adminCookie);
  assert(checks, '17-E.auth.admin_allowed', 200, result.status, 'ADMIN must access ADMIN area.');

  result = await request('POST', '/api/auth/logout', undefined, adminCookie);
  assert(checks, '17-E.auth.logout', 200, result.status, 'Logout must succeed.');
  result = await request('GET', '/api/auth/me', undefined, adminCookie);
  assert(checks, '17-E.auth.revocation', 401, result.status, 'Revoked sessions must be rejected.');
} catch (error) {
  checks.push({ id: '17-E.auth.harness', status: 'FAIL', expected: 'reachable application auth boundary', actual: 'error', detail: error.message });
}

const report = {
  schemaVersion: '1.0.0',
  harness: '17-E.11-B application server authentication/RBAC boundary',
  generatedAt: new Date().toISOString(),
  applicationRuntimeIntegrated: false,
  integrationFixture: true,
  checks
};
console.log(JSON.stringify(report, null, 2));
process.exitCode = checks.some(check => check.status !== 'PASS') ? 1 : 0;
