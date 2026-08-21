/* Phase 4.7.14 — Compatibility Regression Harness */
(function (global) {
  'use strict';
  function run() {
    const checks = [
      ['localStorage available', typeof localStorage !== 'undefined'],
      ['meetingHistory remains readable', (function(){ try { const v=localStorage.getItem('meetingHistory'); return v===null || JSON.parse(v)!==undefined; } catch(_) { return false; } })()],
      ['canonical contract exposed', typeof global.createPhase471CanonicalContract === 'function'],
      ['sync queue exposed', !!global.phase4710PersistentSyncQueue],
      ['retry policy exposed', !!global.phase4711RetryPolicy],
      ['integrity verifier exposed', !!global.phase4712Integrity],
      ['cloud adapter factory exposed', typeof global.createPhase478CloudAdapter === 'function']
    ];
    return { phase:'4.7.14', passed:checks.every(function(c){return c[1];}), checks:checks.map(function(c){return {name:c[0],passed:c[1]};}) };
  }
  global.runPhase4714CompatibilityRegression = run;
})(window);
