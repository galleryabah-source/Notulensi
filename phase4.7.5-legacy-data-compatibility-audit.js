/* Phase 4.7.5 — Legacy Data Compatibility Audit
 * Read-only audit. No migration, deletion, or mutation of existing meeting data.
 */
(function (global) {
  'use strict';

  const KEYS = [
    'meetingHistory',
    'meeting_ai_document_packs_v43',
    'meeting_ai_document_governance_v46',
    'meeting_ai_governance_regression_v461'
  ];

  function safeRead(key) {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) return { key, present: false, validJson: true, value: null };
      const value = JSON.parse(raw);
      return { key, present: true, validJson: true, value };
    } catch (error) {
      return { key, present: true, validJson: false, value: null, error: String(error && error.message || error) };
    }
  }

  function classify(entry) {
    if (!entry.present) return 'missing';
    if (!entry.validJson) return 'invalid-json';
    if (Array.isArray(entry.value)) return 'array';
    if (entry.value && typeof entry.value === 'object') return 'object';
    return typeof entry.value;
  }

  function auditLegacyData() {
    const entries = KEYS.map(safeRead).map(function (entry) {
      return Object.assign({}, entry, { shape: classify(entry) });
    });

    return {
      phase: '4.7.5',
      name: 'Legacy Data Compatibility Audit',
      readOnly: true,
      generatedAt: new Date().toISOString(),
      entries,
      safeToProceed: entries.every(function (entry) {
        return !entry.present || entry.validJson;
      })
    };
  }

  global.runPhase475LegacyAudit = auditLegacyData;
})(window);
