/* Phase 4.7.11 — Retry / Backoff Policy */
(function (global) {
  'use strict';

  function classify(error) {
    const code = String(error && (error.code || error.reason || error.status) || '').toUpperCase();
    if (['VALIDATION','UNAUTHORIZED','FORBIDDEN','CONFLICT'].includes(code)) return { retryable: false, reason: code };
    if (['TIMEOUT','NETWORK','5XX','TEMPORARY'].includes(code)) return { retryable: true, reason: code };
    return { retryable: true, reason: 'UNKNOWN_TRANSIENT' };
  }

  function nextDelay(attempt, baseMs, maxMs) {
    const n = Math.max(0, Number(attempt) || 0);
    const base = Math.max(250, Number(baseMs) || 1000);
    const max = Math.max(base, Number(maxMs) || 60000);
    return Math.min(max, base * Math.pow(2, n));
  }

  global.phase4711RetryPolicy = { classify, nextDelay };
})(window);
