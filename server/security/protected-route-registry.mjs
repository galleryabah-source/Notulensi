import { assertSecurityActivation } from './activation-gate.mjs';

export function createProtectedRouteRegistry({
  env = process.env,
  liveIntegrationVerified = false,
  endpointRegressionVerified = false,
} = {}) {
  let activation;
  const routes = new Map();

  function ensureActivation() {
    if (!activation) {
      activation = assertSecurityActivation({
        env,
        liveIntegrationVerified,
        endpointRegressionVerified,
      });
    }
    return activation;
  }

  return Object.freeze({
    register(name, route) {
      if (!name || typeof name !== 'string') throw new TypeError('route name is required');
      if (typeof route !== 'function') throw new TypeError('route must be a function');
      ensureActivation();
      if (routes.has(name)) throw new Error('PROTECTED_ROUTE_ALREADY_REGISTERED');
      routes.set(name, route);
      return route;
    },
    get(name) {
      return routes.get(name);
    },
    has(name) {
      return routes.has(name);
    },
    names() {
      return Object.freeze([...routes.keys()]);
    },
  });
}
