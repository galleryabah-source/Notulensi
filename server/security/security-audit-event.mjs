const DECISIONS = new Set(['ALLOW', 'DENY']);

export function buildSecurityAuditEvent({
  eventType = 'PROTECTED_ROUTE_DECISION',
  timestamp = new Date().toISOString(),
  requestId,
  actorUserId,
  sessionId,
  endpointName,
  resourceType,
  resourceId,
  operation,
  requiredPermission,
  decision,
  reasonCode,
} = {}) {
  if (!requestId) throw new TypeError('requestId is required');
  if (!endpointName) throw new TypeError('endpointName is required');
  if (!DECISIONS.has(decision)) throw new TypeError('invalid decision');
  if (!reasonCode) throw new TypeError('reasonCode is required');

  return Object.freeze({
    eventType,
    timestamp,
    requestId,
    actorUserId: actorUserId ?? null,
    sessionId: sessionId ?? null,
    endpointName,
    resourceType: resourceType ?? null,
    resourceId: resourceId ?? null,
    operation: operation ?? null,
    requiredPermission: requiredPermission ?? null,
    decision,
    reasonCode,
  });
}
