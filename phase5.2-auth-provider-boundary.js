/* Phase 5.2 — Authentication Provider Boundary
 * Interface only. No credentials, tokens, or network calls are handled here.
 */
(function (global) {
  'use strict';

  function createAuthProvider(implementation) {
    implementation = implementation || {};
    const methods = ['signIn', 'signOut', 'getSession', 'refreshSession'];
    return methods.reduce(function (api, name) {
      api[name] = typeof implementation[name] === 'function'
        ? implementation[name].bind(implementation)
        : async function () { return { ok:false, reason:'NOT_IMPLEMENTED', operation:name }; };
      return api;
    }, { provider: implementation.provider || 'none', version:'5.2.0' });
  }

  global.createPhase52AuthProvider = createAuthProvider;
})(window);
