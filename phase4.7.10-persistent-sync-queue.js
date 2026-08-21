/* Phase 4.7.10 — Persistent Sync Queue
 * Queue metadata is isolated from meeting payloads and supports safe retry bookkeeping.
 */
(function (global) {
  'use strict';

  const KEY = 'meeting_ai_sync_queue_v4710';

  function read() {
    try {
      const value = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(value) ? value : [];
    } catch (_) { return []; }
  }

  function write(items) {
    localStorage.setItem(KEY, JSON.stringify(items));
    return items;
  }

  function enqueue(item) {
    const items = read();
    const entry = Object.assign({
      id: 'sync-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      status: 'pending',
      attempts: 0,
      createdAt: new Date().toISOString()
    }, item || {});
    items.push(entry);
    write(items);
    return entry;
  }

  function update(id, patch) {
    const items = read().map(function (item) {
      return item.id === id ? Object.assign({}, item, patch || {}) : item;
    });
    write(items);
    return items.find(function (item) { return item.id === id; }) || null;
  }

  function remove(id) {
    write(read().filter(function (item) { return item.id !== id; }));
  }

  global.phase4710PersistentSyncQueue = { read, write, enqueue, update, remove, key: KEY };
})(window);
