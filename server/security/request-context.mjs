import crypto from 'node:crypto';
import { hashToken } from '../repositories/security-repository.mjs';

const bearer = /^Bearer\s+(.+)$/i;

function header(headers, name) {
  if (!headers) return '';
  if (typeof headers.get === 'function') return headers.get(name) || '';
  const key = Object.keys(headers).find((candidate) => candidate.toLowerCase() === name.toLowerCase());
  const value = key ? headers[key] : '';
  return Array.isArray(value) ? value[0] || '' : String(value || '');
}

export function createRequestContextResolver({ repository, createRequestId = () => crypto.randomUUID() }) {
  if (!repository || typeof repository.getActiveSessionByTokenHash !== 'function') {
    throw new TypeError('repository.getActiveSessionByTokenHash is required');
  }

  return async function resolveRequestContext(request, authorizationInput = {}) {
    const authorization = header(request?.headers, 'authorization');
    const match = bearer.exec(authorization.trim());
    if (!match) throw new Error('Authentication required');

    const token = match[1].trim();
    if (!token || token.length > 4096) throw new Error('Invalid bearer token');

    // Raw bearer tokens are used only in memory for lookup and are never returned or persisted here.
    const session = await repository.getActiveSessionByTokenHash(hashToken(token));
    if (!session) throw new Error('Session invalid or expired');

    const requestId = String(header(request?.headers, 'x-request-id') || createRequestId());
    if (!requestId || requestId.length > 128) throw new Error('Invalid request id');

    return Object.freeze({
      ...authorizationInput,
      sessionId: session.sessionId,
      actorUserId: session.userId,
      requestId,
    });
  };
}

export function createAnonymousRequestContext() {
  return async () => { throw new Error('Authentication required'); };
}
