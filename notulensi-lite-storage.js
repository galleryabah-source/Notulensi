(() => {
  'use strict';
  const KEY = 'notulensi:lite:v2';
  const DB_NAME = 'notulensi-lite';
  const STORE = 'recordings';
  const storage = {
    read() {
      try { return JSON.parse(localStorage.getItem(KEY) || '{}'); }
      catch (_) { return {}; }
    },
    write(value) {
      localStorage.setItem(KEY, JSON.stringify(value));
      return true;
    },
    clear() { localStorage.removeItem(KEY); }
  };
  function openDb() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) return reject(new Error('INDEXEDDB_UNAVAILABLE'));
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('INDEXEDDB_OPEN_FAILED'));
    });
  }
  async function putRecording(blob) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put({ id: 'latest', blob, savedAt: new Date().toISOString() });
      tx.oncomplete = () => { db.close(); resolve(true); };
      tx.onerror = () => { db.close(); reject(tx.error || new Error('INDEXEDDB_WRITE_FAILED')); };
    });
  }
  async function getRecording() {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get('latest');
      req.onsuccess = () => { db.close(); resolve(req.result || null); };
      req.onerror = () => { db.close(); reject(req.error || new Error('INDEXEDDB_READ_FAILED')); };
    });
  }
  async function clearRecording() {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete('latest');
      tx.oncomplete = () => { db.close(); resolve(true); };
      tx.onerror = () => { db.close(); reject(tx.error || new Error('INDEXEDDB_DELETE_FAILED')); };
    });
  }
  window.notulensiLiteStorage = Object.freeze({ ...storage, putRecording, getRecording, clearRecording });
})();
