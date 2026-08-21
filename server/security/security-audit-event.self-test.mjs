import assert from 'node:assert/strict';
import { buildSecurityAuditEvent } from './security-audit-event.mjs';

const event = buildSecurityAuditEvent({
  timestamp: '2026-08-21T00:00:00.000Z',
  requestId: 'request-434',
  actorUserId: 'user-434',
  sessionId: 'session-434',
  endpointName: 'meeting.read.pilot',
  resourceType: 'MEETING',
  resourceId: 'meeting-434',
  operation: 'READ',
  requiredPermission: 'VIEW',
  decision: 'ALLOW',
  reasonCode: 'PERMISSION_GRANTED',
});

assert.deepEqual(event, {
  eventType: 'PROTECTED_ROUTE_DECISION',
  timestamp: '2026-08-21T00:00:00.000Z',
  requestId: 'request-434',
  actorUserId: 'user-434',
  sessionId: 'session-434',
  endpointName: 'meeting.read.pilot',
  resourceType: 'MEETING',
  resourceId: 'meeting-434',
  operation: 'READ',
  requiredPermission: 'VIEW',
  decision: 'ALLOW',
  reasonCode: 'PERMISSION_GRANTED',
});

const serialized = JSON.stringify(event);
assert.equal(serialized.includes('Authorization'), false);
assert.equal(serialized.includes('apiKey'), false);
assert.equal(serialized.includes('transcript'), false);
assert.equal(Object.isFrozen(event), true);

assert.throws(() => buildSecurityAuditEvent({
  requestId: 'request-434',
  endpointName: 'meeting.read.pilot',
  decision: 'MAYBE',
  reasonCode: 'BAD',
}), /invalid decision/);

console.log('Phase 4.34 security audit event self-test: PASS');
