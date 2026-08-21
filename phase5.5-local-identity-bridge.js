/* Phase 5.5 — Local Identity Bridge
 * Additive, local-only identity bridge. No authentication provider and no remote calls.
 */
(function (global) {
  'use strict';
  const KEY = 'meeting_ai_local_identity_v55';
  function get() {
    try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (_) { return null; }
  }
  function set(identity) {
    if (!identity || !identity.userId) throw new Error('IDENTITY_REQUIRED');
    localStorage.setItem(KEY, JSON.stringify(identity));
    return identity;
  }
  function clear() { localStorage.removeItem(KEY); }
  global.phase55LocalIdentityBridge = { key: KEY, get, set, clear };
})(window);
