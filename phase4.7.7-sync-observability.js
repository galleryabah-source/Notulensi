/* Phase 4.7.7 — Sync State Observability */
(function (global) {
  'use strict';

  function snapshot() {
    const queue = global.phase472SyncQueue || global.getPhase472SyncQueue;
    let items = [];
    try {
      if (typeof queue === 'function') items = queue() || [];
      else if (queue && Array.isArray(queue.items)) items = queue.items;
    } catch (_) {
      items = [];
    }

    const counts = { pending: 0, syncing: 0, done: 0, failed: 0, conflict: 0 };
    items.forEach(function (item) {
      const status = String(item && item.status || 'pending').toLowerCase();
      if (Object.prototype.hasOwnProperty.call(counts, status)) counts[status] += 1;
      else counts.pending += 1;
    });

    return {
      phase: '4.7.7',
      generatedAt: new Date().toISOString(),
      total: items.length,
      counts,
      healthy: counts.failed === 0 && counts.conflict === 0
    };
  }

  global.getPhase477SyncObservability = snapshot;
})(window);
