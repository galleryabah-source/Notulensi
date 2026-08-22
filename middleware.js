import crypto from 'node:crypto';

const COOKIE = 'notulensi_admin_session';
const PROTECTED = new Set(['/admin-settings.html', '/ai-settings-v2.html']);

function validSession(request) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return false;
  const header = request.headers.get('cookie') || '';
  const part = header.split(';').map((x) => x.trim()).find((x) => x.startsWith(`${COOKIE}=`));
  const token = part ? part.slice(COOKIE.length + 1) : '';
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;
  try {
    const raw = Buffer.from(payload, 'base64url').toString('utf8');
    const expected = crypto.createHmac('sha256', secret).update(raw).digest();
    const actual = Buffer.from(signature, 'base64url');
    if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return false;
    const session = JSON.parse(raw);
    return Boolean(session?.exp && session.exp >= Date.now() && ['ADMIN', 'SUPER_ADMIN'].includes(session.role));
  } catch {
    return false;
  }
}

export default function middleware(request) {
  const path = new URL(request.url).pathname;
  if (!PROTECTED.has(path)) return;
  if (validSession(request)) return;
  const login = new URL('/admin-login.html', request.url);
  login.searchParams.set('next', path);
  return Response.redirect(login, 302);
}

export const config = {
  matcher: ['/admin-settings.html', '/ai-settings-v2.html']
};
