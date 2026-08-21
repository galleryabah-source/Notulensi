import jwt from 'jsonwebtoken';
import { z } from 'zod';

const userIdSchema = z.string().uuid();

function authConfig() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error('JWT_SECRET must be at least 32 characters');
  return {
    secret,
    issuer: process.env.AUTH_ISSUER || undefined,
    audience: process.env.AUTH_AUDIENCE || undefined,
    algorithms: ['HS256']
  };
}

export function verifyAccessToken(token) {
  const config = authConfig();
  const claims = jwt.verify(token, config.secret, {
    algorithms: config.algorithms,
    ...(config.issuer ? { issuer: config.issuer } : {}),
    ...(config.audience ? { audience: config.audience } : {})
  });

  if (!claims || typeof claims !== 'object') throw new Error('invalid_claims');
  const userId = userIdSchema.parse(String(claims.sub || ''));
  return { userId };
}

export function readBearerToken(req) {
  const value = req.get('authorization') || '';
  if (!value.startsWith('Bearer ')) return null;
  const token = value.slice(7).trim();
  return token || null;
}

export async function authenticateRequest(req, res, next, pool) {
  const token = readBearerToken(req);
  if (!token) return res.status(401).json({ error: 'authentication_required' });

  try {
    const { userId } = verifyAccessToken(token);
    const result = await pool.query(
      `SELECT id, email, status, role, created_at
       FROM users
       WHERE id=$1
       LIMIT 1`,
      [userId]
    );

    if (!result.rowCount || result.rows[0].status !== 'active') {
      return res.status(401).json({ error: 'account_inactive' });
    }

    const user = result.rows[0];
    req.user = {
      id: String(user.id),
      email: user.email,
      role: user.role
    };
    req.account = user;
    return next();
  } catch {
    return res.status(401).json({ error: 'invalid_authentication' });
  }
}

export function authenticateOptional(req, pool) {
  const token = readBearerToken(req);
  if (!token) return Promise.resolve(null);

  return Promise.resolve().then(async () => {
    try {
      const { userId } = verifyAccessToken(token);
      const result = await pool.query(
        `SELECT id, email, status, role, created_at
         FROM users
         WHERE id=$1
         LIMIT 1`,
        [userId]
      );
      if (!result.rowCount || result.rows[0].status !== 'active') return null;
      const user = result.rows[0];
      return { id: String(user.id), email: user.email, role: user.role };
    } catch {
      return null;
    }
  });
}
