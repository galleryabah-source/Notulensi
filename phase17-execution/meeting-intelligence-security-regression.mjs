import http from 'node:http';

const base = process.env.RUNTIME_BASE_URL || 'http://127.0.0.1:4173';
const ttlMs = Number(process.env.APPLICATION_SESSION_TTL_MS || 1000);

function request(method, path, body, cookie) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, base);
    const payload = body === undefined ? null : JSON.stringify(body);
    const req = http.request(url, {
      method,
      headers: {
        ...(payload ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) } : {}),
        ...(cookie ? { cookie } : {})
      }
    }, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

const checks = [];
function check(id, expected, actual, detail) {
  const status = expected === actual ? 'PASS' : 'FAIL';
  checks.push({ id, status, expected, actual, detail });
  return status === 'PASS';
}
function checkTrue(id, value, detail) {
  return check(id, true, value, detail);
}

try {
  let r = await request('GET', '/api/auth/me');
  check('17-E.security.unauthenticated_boundary', 401, r.status, 'Protected session endpoint must reject unauthenticated requests.');
  check('17-E.security.api_no_store', 'no-store', r.headers['cache-control'], 'Authentication responses must not be cached.');
  check('17-E.security.api_nosniff', 'nosniff', r.headers['x-content-type-options'], 'API responses must disable MIME sniffing.');

  r = await request('GET', '/meeting-intelligence-app-phase4.3-integrated-safe.html');
  check('17-E.security.html_nosniff', 'nosniff', r.headers['x-content-type-options'], 'Application HTML must disable MIME sniffing.');
  check('17-E.security.html_referrer_policy', 'no-referrer', r.headers['referrer-policy'], 'Application HTML must restrict referrer disclosure.');

  r = await request('POST', '/api/auth/login', { username: 'viewer-a', password: 'wrong' });
  check('17-E.security.invalid_credentials', 401, r.status, 'Invalid credentials must not authenticate.');

  r = await request('POST', '/api/auth/login', { username: 'viewer-a', password: 'phase17-viewer-password' });
  const cookie = r.headers['set-cookie']?.[0]?.split(';', 1)[0];
  check('17-E.security.login', 200, r.status, 'Valid credentials must authenticate through the real runtime.');
  checkTrue('17-E.security.cookie_httponly', /HttpOnly/i.test(r.headers['set-cookie']?.[0] || ''), 'Session cookie must be HttpOnly.');
  checkTrue('17-E.security.cookie_samesite', /SameSite=Strict/i.test(r.headers['set-cookie']?.[0] || ''), 'Session cookie must use SameSite=Strict.');
  checkTrue('17-E.security.cookie_path', /Path=\//i.test(r.headers['set-cookie']?.[0] || ''), 'Session cookie must be scoped to the application path.');

  r = await request('GET', '/api/auth/me', undefined, cookie);
  check('17-E.security.authenticated_session', 200, r.status, 'Authenticated session must be recognized.');

  const tamperedCookie = cookie ? `${cookie.slice(0, -1)}${cookie.endsWith('0') ? '1' : '0'}` : 'phase17_session=tampered';
  r = await request('GET', '/api/auth/me', undefined, tamperedCookie);
  check('17-E.security.tampered_session', 401, r.status, 'Modified session tokens must not be accepted.');

  r = await request('GET', '/api/protected/admin', undefined, cookie);
  check('17-E.security.vertical_privilege_escalation', 403, r.status, 'VIEWER must not reach ADMIN resources.');

  r = await request('GET', '/api/protected/owners/owner-b', undefined, cookie);
  check('17-E.security.horizontal_privilege_escalation', 403, r.status, 'A user must not access another owner boundary.');

  r = await request('GET', '/api/protected/owners/owner-a', undefined, cookie);
  check('17-E.security.owner_authorization', 200, r.status, 'A user must retain access to its own owner boundary.');

  r = await request('POST', '/api/protected/admin', undefined, cookie);
  check('17-E.security.method_boundary', 404, r.status, 'Unsupported methods must not bypass the protected GET route.');

  r = await request('GET', '/api/protected/admin');
  check('17-E.security.direct_api_access', 401, r.status, 'Direct protected API access without a session must remain denied.');

  r = await request('GET', '/%2e%2e/%2e%2e/phase17-execution/runtime-harness.mjs');
  check('17-E.security.path_traversal_boundary', 403, r.status, 'Encoded traversal must be rejected before filesystem normalization.');

  r = await request('POST', '/api/auth/logout', undefined, cookie);
  check('17-E.security.logout', 200, r.status, 'Logout must invalidate the active session.');

  r = await request('GET', '/api/auth/me', undefined, cookie);
  check('17-E.security.post_logout_reuse', 401, r.status, 'A logged-out session token must not be reusable.');

  r = await request('POST', '/api/auth/login', { username: 'viewer-a', password: 'phase17-viewer-password' });
  const expiringCookie = r.headers['set-cookie']?.[0]?.split(';', 1)[0];
  check('17-E.security.expiry_login', 200, r.status, 'A fresh session must authenticate before expiry.');
  await new Promise(resolve => setTimeout(resolve, Math.max(ttlMs + 100, 1100)));
  r = await request('GET', '/api/auth/me', undefined, expiringCookie);
  check('17-E.security.expired_session', 401, r.status, 'Expired sessions must be rejected by the runtime.');

  r = await request('GET', '/api/auth/me', undefined, expiringCookie);
  check('17-E.security.expired_session_reuse', 401, r.status, 'An expired session must remain rejected on subsequent requests.');
} catch (error) {
  checks.push({ id: '17-E.security.harness', status: 'FAIL', expected: 'reachable real runtime', actual: 'error', detail: error.message });
}

const report = {
  schemaVersion: '1.0.0',
  checkId: '17-E.runtime.security',
  phase: '17-E.12',
  name: 'Real application runtime security regression',
  generatedAt: new Date().toISOString(),
  runtimeBaseUrl: base,
  integrationFixture: false,
  applicationRuntimeIntegrated: true,
  checks
};

console.log(JSON.stringify(report, null, 2));
process.exitCode = checks.some(check => check.status !== 'PASS') ? 1 : 0;
