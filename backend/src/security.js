import crypto from 'node:crypto';

export function hashSecret(value, pepper) {
  if (typeof pepper !== 'string' || pepper.length < 32) {
    throw new Error('token pepper must be at least 32 characters');
  }
  return crypto.createHmac('sha256', pepper).update(String(value)).digest('hex');
}

export function safeEqualHash(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (!/^[0-9a-f]{64}$/i.test(a) || !/^[0-9a-f]{64}$/i.test(b)) return false;
  const left = Buffer.from(a, 'hex');
  const right = Buffer.from(b, 'hex');
  return crypto.timingSafeEqual(left, right);
}

export function issueToken(randomBytes = crypto.randomBytes) {
  return randomBytes(32).toString('base64url');
}

export function expiresAtFromPolicy(policy, now = Date.now()) {
  const ttlMinutes = Number(policy?.ttlMinutes);
  if (!Number.isInteger(ttlMinutes) || ttlMinutes < 1 || ttlMinutes > 60 * 24 * 30) {
    throw new Error('invalid ttlMinutes');
  }
  return new Date(now + ttlMinutes * 60_000);
}

export function hashClient(value, pepper) {
  return hashSecret(value || '', pepper);
}
