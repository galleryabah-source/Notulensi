(() => {
  'use strict';
  const KEY = 'notulensi:lite:v1';
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
  window.notulensiLiteStorage = Object.freeze(storage);
})();
