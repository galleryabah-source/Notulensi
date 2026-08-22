/* Phase 5.9 — Sync Authorization Boundary
 * Authorization contract only. No remote requests are performed.
 */
(function (global) {
  'use strict';
  const ALLOWED = ['read','write','delete','list','query'];
  function authorize(identity, operation, resource, ownerId) {
    const userId = identity && identity.userId;
    if (!userId) return { allowed:false, reason:'AUTH_REQUIRED' };
    if (!ALLOWED.includes(operation)) return { allowed:false, reason:'OPERATION_NOT_ALLOWED' };
    if (!resource) return { allowed:false, reason:'RESOURCE_REQUIRED' };
    if (ownerId && String(ownerId) !== String(userId)) return { allowed:false, reason:'OWNER_MISMATCH' };
    return { allowed:true, userId:String(userId), operation, resource };
  }
  global.phase59SyncAuthorization = { authorize, allowedOperations:ALLOWED.slice() };
})(window);
