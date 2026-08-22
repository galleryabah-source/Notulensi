/* Phase 5.1 — Personal Cloud Identity Contract
 * Contract only. No authentication provider and no network access.
 */
(function (global) {
  'use strict';

  function createIdentity(input) {
    input = input || {};
    return {
      schema: 'meeting-intelligence.identity',
      schemaVersion: '5.1.0',
      userId: input.userId || null,
      email: input.email || null,
      displayName: input.displayName || null,
      provider: input.provider || 'local',
      createdAt: input.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  global.createPhase51Identity = createIdentity;
})(window);
