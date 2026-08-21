/* Phase 4.7.8 — Cloud Adapter Interface
 * Interface only. No network calls and no provider dependency yet.
 */
(function (global) {
  'use strict';

  function createCloudAdapter(implementation) {
    implementation = implementation || {};
    const methods = ['read', 'write', 'remove', 'list', 'health'];
    return methods.reduce(function (api, name) {
      api[name] = typeof implementation[name] === 'function'
        ? implementation[name].bind(implementation)
        : async function () {
            return { ok: false, reason: 'NOT_IMPLEMENTED', operation: name };
          };
      return api;
    }, { provider: implementation.provider || 'none', version: '4.7.8' });
  }

  global.createPhase478CloudAdapter = createCloudAdapter;
})(window);
