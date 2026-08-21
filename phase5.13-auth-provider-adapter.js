/* Phase 5.13 — Authentication Provider Adapter
 * Contract only. No provider, token, or network operation is activated.
 */
(function (global) {
  'use strict';
  function createAuthAdapter(provider) {
    provider = provider || {};
    return {
      provider: provider.name || 'none',
      signIn: typeof provider.signIn === 'function' ? provider.signIn.bind(provider) : async function(){ return { ok:false, reason:'NOT_IMPLEMENTED' }; },
      signOut: typeof provider.signOut === 'function' ? provider.signOut.bind(provider) : async function(){ return { ok:false, reason:'NOT_IMPLEMENTED' }; },
      getSession: typeof provider.getSession === 'function' ? provider.getSession.bind(provider) : async function(){ return null; },
      refreshSession: typeof provider.refreshSession === 'function' ? provider.refreshSession.bind(provider) : async function(){ return { ok:false, reason:'NOT_IMPLEMENTED' }; }
    };
  }
  global.createPhase513AuthProviderAdapter = createAuthAdapter;
})(window);
