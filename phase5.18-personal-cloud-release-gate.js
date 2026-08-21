/* Phase 5.18 — Personal Cloud Release Gate */
(function (global) {
  'use strict';
  function run(regression, readiness) {
    const checks = [
      ['cloud sync regression passed', !!(regression && regression.passed === true)],
      ['cloud readiness contract valid', !!(readiness && /CONTRACT_READY/.test(String(readiness.status || '')))]
    ];
    const passed = checks.every(function(c){return c[1];});
    return {phase:'5.18',status:passed?'RUNTIME_VALIDATION_REQUIRED':'BLOCKED',productionReady:false,cloudActivated:false,checks:checks.map(function(c){return {name:c[0],passed:c[1]};})};
  }
  global.runPhase518PersonalCloudReleaseGate = run;
})(window);
