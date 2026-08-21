const METHODS = Object.freeze(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
const OPERATIONS = Object.freeze(['READ', 'CREATE', 'UPDATE', 'DELETE', 'MANAGE', 'SHARE']);
const PERMISSIONS = Object.freeze(['VIEW', 'COMMENT', 'EDIT', 'SHARE', 'MANAGE']);

export function createProtectedEndpointContract({
  name,
  method,
  resourceType,
  requiredPermission,
  operation,
  resolveResourceId,
  validateRequest,
}) {
  if (!name || typeof name !== 'string') throw new TypeError('name is required');
  if (!METHODS.includes(method)) throw new TypeError('invalid method');
  if (!resourceType || typeof resourceType !== 'string') throw new TypeError('resourceType is required');
  if (!PERMISSIONS.includes(requiredPermission)) throw new TypeError('invalid requiredPermission');
  if (!OPERATIONS.includes(operation)) throw new TypeError('invalid operation');
  if (typeof resolveResourceId !== 'function') throw new TypeError('resolveResourceId is required');
  if (typeof validateRequest !== 'function') throw new TypeError('validateRequest is required');

  return Object.freeze({
    name,
    method,
    resourceType,
    requiredPermission,
    operation,
    resolveResourceId,
    validateRequest,
  });
}

export function buildAuthorizationInput(contract, request, context) {
  if (!contract || typeof contract !== 'object') throw new TypeError('contract is required');
  if (!request || typeof request !== 'object') throw new TypeError('request is required');
  if (!context || typeof context !== 'object') throw new TypeError('context is required');
  if (request.method !== contract.method) {
    const error = new Error('METHOD_NOT_ALLOWED');
    error.code = 'METHOD_NOT_ALLOWED';
    throw error;
  }

  contract.validateRequest(request);
  const resourceId = contract.resolveResourceId(request);
  if (!resourceId || typeof resourceId !== 'string') {
    const error = new Error('RESOURCE_ID_REQUIRED');
    error.code = 'RESOURCE_ID_REQUIRED';
    throw error;
  }

  return Object.freeze({
    sessionId: context.sessionId,
    actorUserId: context.actorUserId,
    requestId: context.requestId,
    resourceType: contract.resourceType,
    resourceId,
    requiredPermission: contract.requiredPermission,
    operation: contract.operation,
  });
}

export const PHASE_429_ENDPOINT_CONTRACT = Object.freeze({
  version: '4.29',
  methods: METHODS,
  operations: OPERATIONS,
  permissions: PERMISSIONS,
  denyByDefault: true,
});
