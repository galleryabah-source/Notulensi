/**
 * Phase 4.37 — Pilot Verification Evidence
 *
 * A protected endpoint is not considered production-ready from configuration
 * alone. This evidence record makes each required verification explicit and
 * keeps an incomplete pilot fail-closed.
 */

const BOOLEAN_KEYS = Object.freeze([
  'authenticatedRequestContextVerified',
  'ownershipVerified',
  'authorizationDecisionVerified',
  'auditEventVerified',
  'livePostgresVerified',
  'endpointRegressionVerified',
  'activationApproved',
]);

export function createPilotVerificationEvidence({
  endpointName,
  ...values
} = {}) {
  if (!endpointName || typeof endpointName !== 'string') {
    throw new TypeError('endpointName is required');
  }

  const evidence = Object.fromEntries(
    BOOLEAN_KEYS.map((key) => [key, values[key] === true]),
  );

  return Object.freeze({
    version: '4.37',
    endpointName,
    ...evidence,
    productionReady: BOOLEAN_KEYS.every((key) => evidence[key] === true),
  });
}

export function isPilotProductionReady(evidence) {
  if (!evidence || typeof evidence !== 'object') return false;
  return evidence.productionReady === true &&
    BOOLEAN_KEYS.every((key) => evidence[key] === true);
}
