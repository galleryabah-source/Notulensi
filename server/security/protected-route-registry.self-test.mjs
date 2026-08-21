import assert from 'node:assert/strict';
import { createProtectedRouteRegistry } from './protected-route-registry.mjs';

assert.throws(() => createProtectedRouteRegistry({
  env: { ENABLE_PROTECTED_ROUTES: 'false' },
  liveIntegrationVerified: true,
  endpointRegressionVerified: true,
}).register('meeting.read', async () => ({ status: 200 })), /SECURITY_ACTIVATION_DENIED/);

const registry = createProtectedRouteRegistry({
  env: { ENABLE_PROTECTED_ROUTES: 'true' },
  liveIntegrationVerified: true,
  endpointRegressionVerified: true,
});

const route = async () => ({ status: 200 });
assert.equal(registry.register('meeting.read', route), route);
assert.equal(registry.get('meeting.read'), route);
assert.equal(registry.has('meeting.read'), true);
assert.deepEqual(registry.names(), ['meeting.read']);
assert.throws(() => registry.register('meeting.read', route), /PROTECTED_ROUTE_ALREADY_REGISTERED/);

console.log('Phase 4.33 protected route registry self-test: PASS');
