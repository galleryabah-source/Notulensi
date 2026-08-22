import crypto from 'node:crypto';

const COOKIE = 'notulensi_admin_session';

export function getAdminSession(req) {
  try {
    const cookie = String(req.headers.cookie || '')
      .split(';')
      .map((x) => x.trim())
      .find((x) => x.startsWith(`${COOKIE}=`));
    const token = cookie ? cookie.slice(COOKIE.length + 1) : '';
    const [payload, signature] = token.split('.');
    if (!payload || !signature || !process.env.ADMIN_SESSION_SECRET) return null;
    const raw = Buffer.from(payload, 'base64url').toString('utf8');
    const expected = crypto.createHmac('sha256', process.env.ADMIN_SESSION_SECRET).update(raw).digest();
    const actual = Buffer.from(signature, 'base64url');
    if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;
    const session = JSON.parse(raw);
    if (!session.exp || session.exp < Date.now()) return null;
    if (!['ADMIN', 'SUPER_ADMIN'].includes(session.role)) return null;
    return session;
  } catch {
    return null;
  }
}

export function requireAdmin(req, res) {
  const session = getAdminSession(req);
  if (!session) {
    res.status(401).json({ authenticated: false, error: 'Admin session required.' });
    return null;
  }
  return session;
}
