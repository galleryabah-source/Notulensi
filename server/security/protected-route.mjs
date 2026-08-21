export function createProtectedRoute({ authorize, resolveContext, resolveAuthorizationInput, handler }) {
  if (typeof authorize !== 'function') throw new TypeError('authorize is required');
  if (typeof resolveContext !== 'function') throw new TypeError('resolveContext is required');
  if (typeof resolveAuthorizationInput !== 'function') throw new TypeError('resolveAuthorizationInput is required');
  if (typeof handler !== 'function') throw new TypeError('handler is required');

  return async function protectedRoute(request) {
    let context;
    try {
      context = await resolveContext(request);
    } catch {
      return { status: 401, body: { ok: false, error: 'AUTHENTICATION_REQUIRED' } };
    }

    let authorizationInput;
    try {
      authorizationInput = await resolveAuthorizationInput(request, context);
    } catch {
      return { status: 400, body: { ok: false, error: 'REQUEST_INVALID' } };
    }

    const decision = await authorize(request, authorizationInput);
    if (!decision.allowed) {
      return { status: decision.status, body: { ok: false, error: decision.reasonCode } };
    }

    return handler(request, Object.freeze({ context, authorization: decision }));
  };
}
