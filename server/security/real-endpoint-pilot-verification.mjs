/**
 * Phase 4.37 — Real Endpoint Pilot Verification
 *
 * Verification harness only. It does not mount a production route, mutate the
 * existing HTML application, or claim live verification without explicit
 * evidence supplied by the real environment.
 */

export const REAL_ENDPOINT_PILOT = Object.freeze({
  endpoint: 'meeting.read',
  method: 'GET',
  resourceType: 'MEETING',
  requiredPermission: 'VIEW',
  requiredChecks: Object.freeze([
    'authenticated-request-context',
    'ownership-enforcement',
    'live-postgresql-read',
    'endpoint-regression',
  ]),
});

export function verifyRealEndpointPilotEvidence(evidence = {}) {
  const checks = {
    authenticatedRequestContext: evidence.authenticatedRequestContext === true,
    ownershipEnforcement: evidence.ownershipEnforcement === true,
    livePostgresRead: evidence.livePostgresRead === true,
    endpointRegression: evidence.endpointRegression === true,
  };

  return Object.freeze({
    endpoint: REAL_ENDPOINT_PILOT.endpoint,
    ready: Object.values(checks).every(Boolean),
    checks: Object.freeze(checks),
  });
}

export function assertRealEndpointPilotReady(evidence = {}) {
  const result = verifyRealEndpointPilotEvidence(evidence);
  if (!result.ready) {
    const failed = Object.entries(result.checks)
      .filter(([, passed]) => !passed)
      .map(([name]) => name)
      .join(', ');
    throw new Error(`REAL_ENDPOINT_PILOT_NOT_READY:${failed}`);
  }
  return result;
}
