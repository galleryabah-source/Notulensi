const METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'POST', 'PUT', 'PATCH', 'DELETE']);

const normalize = (value) => typeof value === 'string' ? value.trim() : '';

export function createAuthorizationMiddleware({ repository, resolveRequest }) {
  if (!repository || typeof repository.authorizeResourceAccess !== 'function') {
    throw new TypeError('repository.authorizeResourceAccess is required');
  }
  if (typeof resolveRequest !== 'function') {
    throw new TypeError('resolveRequest is required');
  }

  return async function authorize(request) {
    const method = normalize(request?.method).toUpperCase();
    if (!METHODS.has(method)) {
      return { allowed: false, status: 400, reasonCode: 'METHOD_INVALID' };
    }

    let input;
    try {
      input = await resolveRequest(request);
    } catch {
      return { allowed: false, status: 400, reasonCode: 'REQUEST_INVALID' };
    }

    if (!input || typeof input !== 'object') {
      return { allowed: false, status: 400, reasonCode: 'REQUEST_INVALID' };
    }

    const required = ['sessionId', 'actorUserId', 'resourceType', 'resourceId', 'requiredPermission', 'operation', 'requestId'];
    if (required.some((key) => !normalize(input[key]))) {
      return { allowed: false, status: 401, reasonCode: 'AUTHENTICATION_REQUIRED' };
    }

    try {
      const decision = await repository.authorizeResourceAccess(input);
      if (!decision?.allowed) {
        return { allowed: false, status: 403, reasonCode: decision?.reasonCode || 'PERMISSION_DENIED', decision };
      }
      return { allowed: true, status: 200, reasonCode: decision.reasonCode || 'PERMISSION_GRANTED', decision };
    } catch {
      // Fail closed: infrastructure/authorization failures never become implicit access.
      return { allowed: false, status: 503, reasonCode: 'AUTHORIZATION_UNAVAILABLE' };
    }
  };
}

export function createDenyAllAuthorizationMiddleware() {
  return async () => ({ allowed: false, status: 503, reasonCode: 'AUTHORIZATION_UNAVAILABLE' });
}
