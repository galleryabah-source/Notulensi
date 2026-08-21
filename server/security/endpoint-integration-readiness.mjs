/**
 * Phase 4.36 — Real Endpoint Integration Readiness
 *
 * This manifest is intentionally descriptive. It does not mount routes or
 * change existing application behavior. It is the controlled inventory used
 * before selecting a production protected-endpoint pilot.
 */

export const endpointIntegrationReadiness = Object.freeze({
  phase: '4.36',
  status: 'READINESS_ONLY',
  activationPolicy: 'FAIL_CLOSED',
  productionRouteMounting: false,
  endpoints: Object.freeze([
    {
      name: 'meeting.read',
      method: 'GET',
      resourceType: 'MEETING',
      operation: 'READ',
      requiredPermission: 'VIEW',
      pilotCandidate: true,
      productionMounted: false,
      verification: Object.freeze({
        authenticationSource: 'authenticated-request-context',
        ownershipRequired: true,
        livePostgresVerified: false,
        endpointRegressionVerified: false,
        activationApproved: false,
      }),
    },
  ]),
});

export function getEndpointReadiness(name) {
  return endpointIntegrationReadiness.endpoints.find((endpoint) => endpoint.name === name) ?? null;
}

export function isEndpointActivationReady(name) {
  const endpoint = getEndpointReadiness(name);
  if (!endpoint) return false;

  return Boolean(
    endpoint.verification.livePostgresVerified &&
    endpoint.verification.endpointRegressionVerified &&
    endpoint.verification.activationApproved &&
    !endpoint.productionMounted,
  );
}
