import assert from 'node:assert/strict';
import { assertSecurityActivation, evaluateSecurityActivation } from './activation-gate.mjs';

assert.deepEqual(evaluateSecurityActivation({
  env: { ENABLE_PROTECTED_ROUTES: 'false' },
  liveIntegrationVerified: true,
  endpointRegressionVerified: true,
}), {
  enabled: false,
  requested: false,
  reasons: ['PROTECTED_ROUTES_DISABLED'],
});

assert.deepEqual(evaluateSecurityActivation({
  env: { ENABLE_PROTECTED_ROUTES: 'true' },
  liveIntegrationVerified: false,
  endpointRegressionVerified: true,
}), {
  enabled: false,
  requested: true,
  reasons: ['LIVE_POSTGRES_INTEGRATION_NOT_VERIFIED'],
});

assert.deepEqual(evaluateSecurityActivation({
  env: { ENABLE_PROTECTED_ROUTES: '1' },
  liveIntegrationVerified: true,
  endpointRegressionVerified: false,
}), {
  enabled: false,
  requested: true,
  reasons: ['ENDPOINT_REGRESSION_NOT_VERIFIED'],
});

assert.deepEqual(evaluateSecurityActivation({
  env: { ENABLE_PROTECTED_ROUTES: 'yes' },
  liveIntegrationVerified: true,
  endpointRegressionVerified: true,
}), {
  enabled: true,
  requested: true,
  reasons: [],
});

assert.throws(() => assertSecurityActivation({
  env: { ENABLE_PROTECTED_ROUTES: 'true' },
  liveIntegrationVerified: false,
  endpointRegressionVerified: false,
}), /SECURITY_ACTIVATION_DENIED/);

console.log('Phase 4.31 self-test: PASS');
