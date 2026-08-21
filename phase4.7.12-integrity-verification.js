/* Phase 4.7.12 — Integrity Verification */
(function (global) {
  'use strict';

  function stable(value) {
    if (Array.isArray(value)) return value.map(stable);
    if (value && typeof value === 'object') return Object.keys(value).sort().reduce(function (out, key) { out[key] = stable(value[key]); return out; }, {});
    return value;
  }

  function fingerprint(record) {
    return JSON.stringify(stable(record || null));
  }

  function verify(localRecord, incomingRecord) {
    const local = fingerprint(localRecord);
    const incoming = fingerprint(incomingRecord);
    return {
      phase: '4.7.12',
      identical: local === incoming,
      localFingerprint: local,
      incomingFingerprint: incoming
    };
  }

  global.phase4712Integrity = { stable, fingerprint, verify };
})(window);
