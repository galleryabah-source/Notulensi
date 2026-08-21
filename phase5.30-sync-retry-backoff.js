/* Phase 5.30 — Sync Retry + Backoff Policy */
(function (global) {
  'use strict';
  function nextAttempt(attempt, maxAttempts) {
    attempt=Math.max(0,Number(attempt)||0);
    maxAttempts=Math.max(1,Number(maxAttempts)||5);
    if(attempt>=maxAttempts) return {retry:false,status:'RETRY_EXHAUSTED',attempt,maxAttempts};
    const delayMs=Math.min(30000,Math.pow(2,attempt)*1000);
    return {retry:true,status:'RETRY_SCHEDULED',attempt:attempt+1,maxAttempts,delayMs};
  }
  global.phase530RetryPolicy={nextAttempt};
})(window);
