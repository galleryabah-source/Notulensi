/* Phase 5.6 — Anonymous → Authenticated Migration Plan
 * Planning only. Does not move, delete, or upload data.
 */
(function (global) {
  'use strict';
  function plan(records, identity) {
    records = Array.isArray(records) ? records : [];
    const userId = identity && identity.userId;
    return {
      phase: '5.6',
      executable: false,
      destructive: false,
      targetUserId: userId || null,
      total: records.length,
      records: records.map(function (record, index) {
        return {
          index,
          localId: record && record.id || ('legacy-' + index),
          targetOwnerId: userId || null,
          action: userId ? 'REASSIGN_OWNER_AFTER_AUTH' : 'BLOCK_UNTIL_AUTH'
        };
      })
    };
  }
  global.createPhase56MigrationPlan = plan;
})(window);
