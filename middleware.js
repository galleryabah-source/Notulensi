const COOKIE = 'notulensi_admin_session';
const PROTECTED = new Set(['/admin-settings.html', '/ai-settings-v2.html']);

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(normalized);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function validSession(request) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return false;
  const header = request.headers.get('cookie') || '';
  const part = header.split(';').map((x) => x.trim()).find((x) => x.startsWith(`${COOKIE}=`));
  const token = part ? part.slice(COOKIE.length + 1) : '';
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;
  try {
    const rawBytes = decodeBase64Url(payload);
    const raw = new TextDecoder().decode(rawBytes);
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const valid = await crypto.subtle.verify('HMAC', key, decodeBase64Url(signature), rawBytes);
    if (!valid || !timingSafeEqual(decodeBase64Url(signature), decodeBase64Url(signature))) return false;
    const session = JSON.parse(raw);
    return Boolean(session?.exp && session.exp >= Date.now() && ['ADMIN', 'SUPER_ADMIN'].includes(session.role));
  } catch {
    return false;
  }
}

export default async function middleware(request) {
  const path = new URL(request.url).pathname;
  if (!PROTECTED.has(path)) return;
  if (await validSession(request)) return;
  const login = new URL('/admin-login.html', request.url);
  login.searchParams.set('next', path);
  return Response.redirect(login, 302);
}

export const config = {
  matcher: ['/admin-settings.html', '/ai-settings-v2.html']
};
