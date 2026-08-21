/* Phase 5.7 — User-scoped Storage Namespace */
(function (global) {
  'use strict';
  function namespace(userId, resource) {
    if (!userId) throw new Error('USER_ID_REQUIRED');
    if (!resource) throw new Error('RESOURCE_REQUIRED');
    return ['meeting-intelligence', 'user', String(userId), String(resource)].join(':');
  }
  function key(userId, resource, id) {
    const base = namespace(userId, resource);
    return id == null ? base : base + ':' + String(id);
  }
  global.phase57StorageNamespace = { namespace, key };
})(window);
