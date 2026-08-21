const TRUE_VALUES = new Set(['1', 'true', 'yes']);

function isTrue(value) {
  return TRUE_VALUES.has(String(value ?? '').trim().toLowerCase());
}

export function evaluateSecurityActivation({ env = process.env, liveIntegrationVerified = false, endpointRegressionVerified = false } = {}) {
  const requested = isTrue(env.ENABLE_PROTECTED_ROUTES);
  const reasons = [];

  if (!requested) reasons.push('PROTECTED_ROUTES_DISABLED');
  if (!liveIntegrationVerified) reasons.push('LIVE_POSTGRES_INTEGRATION_NOT_VERIFIED');
  if (!endpointRegressionVerified) reasons.push('ENDPOINT_REGRESSION_NOT_VERIFIED');

  return Object.freeze({
    enabled: requested && liveIntegrationVerified && endpointRegressionVerified,
    requested,
    reasons,
  });
}

export function assertSecurityActivation(options = {}) {
  const result = evaluateSecurityActivation(options);
  if (!result.enabled) {
    const error = new Error(`Protected route activation denied: ${result.reasons.join(',')}`);
    error.code = 'SECURITY_ACTIVATION_DENIED';
    error.reasons = result.reasons;
    throw error;
  }
  return result;
}
