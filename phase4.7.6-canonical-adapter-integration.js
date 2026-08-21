/* Phase 4.7.6 — Canonical Adapter Integration
 * Additive boundary: existing storage remains untouched unless explicitly called.
 */
(function (global) {
  'use strict';

  function getContract() {
    return global.createPhase471CanonicalContract || null;
  }

  function getAdapter() {
    return global.phase47StorageAdapter || global.getPhase47StorageAdapter || null;
  }

  function canonicalize(type, id, payload, source) {
    const factory = getContract();
    if (typeof factory === 'function') {
      return factory(type, id, payload, source || 'local');
    }
    return {
      schema: 'meeting-intelligence.canonical',
      schemaVersion: '4.7.1',
      type,
      id,
      revision: 1,
      updatedAt: new Date().toISOString(),
      source: source || 'local',
      payload
    };
  }

  async function writeCanonical(type, id, payload, source) {
    const adapter = getAdapter();
    const record = canonicalize(type, id, payload, source);
    if (!adapter) return { ok: false, reason: 'ADAPTER_UNAVAILABLE', record };
    if (typeof adapter.write === 'function') {
      await adapter.write(type, id, record);
      return { ok: true, record };
    }
    return { ok: false, reason: 'ADAPTER_WRITE_UNAVAILABLE', record };
  }

  async function readCanonical(type, id) {
    const adapter = getAdapter();
    if (!adapter || typeof adapter.read !== 'function') {
      return { ok: false, reason: 'ADAPTER_READ_UNAVAILABLE' };
    }
    return { ok: true, record: await adapter.read(type, id) };
  }

  global.phase476CanonicalAdapter = {
    canonicalize,
    writeCanonical,
    readCanonical
  };
})(window);
