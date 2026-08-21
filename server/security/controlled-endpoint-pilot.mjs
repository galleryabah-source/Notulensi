import { assertSecurityActivation } from './activation-gate.mjs';
import {
  buildAuthorizationInput,
  createProtectedEndpointContract,
} from './protected-endpoint-contract.mjs';
import { createProtectedRoute } from './protected-route.mjs';

export const MEETING_READ_PILOT_CONTRACT = createProtectedEndpointContract({
  name: 'meeting.read.pilot',
  method: 'GET',
  resourceType: 'MEETING',
  requiredPermission: 'VIEW',
  operation: 'READ',
  resolveResourceId: (request) => request.params?.meetingId,
  validateRequest: (request) => {
    if (!request.params?.meetingId) throw new Error('MEETING_ID_REQUIRED');
  },
});

export function createMeetingReadPilot({
  env = process.env,
  liveIntegrationVerified = false,
  endpointRegressionVerified = false,
  resolveContext,
  authorize,
  handler,
} = {}) {
  assertSecurityActivation({
    env,
    liveIntegrationVerified,
    endpointRegressionVerified,
  });

  return createProtectedRoute({
    resolveContext,
    resolveAuthorizationInput: (request, context) =>
      buildAuthorizationInput(MEETING_READ_PILOT_CONTRACT, request, context),
    authorize,
    handler,
  });
}
