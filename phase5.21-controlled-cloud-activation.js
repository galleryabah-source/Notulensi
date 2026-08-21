/* Phase 5.21 — Controlled Cloud Activation
 * Guard only. Cloud is opt-in and cannot activate without explicit runtime evidence.
 */
(function (global) {
  'use strict';
  function evaluate(input) {
    input = input || {};
    const checks = [
      ['auth runtime passed', input.authPassed === true],
      ['database runtime passed', input.databasePassed === true],
      ['sync regression passed', input.syncRegressionPassed === true],
      ['migration safety passed', input.migrationSafetyPassed === true],
      ['explicit activation flag', input.explicitActivation === true]
    ];
    const passed = checks.every(function(c){return c[1];});
    return { phase:'5.21', status:passed?'ACTIVATION_ELIGIBLE':'BLOCKED', cloudActivated:false, destructive:false, checks:checks.map(function(c){return {name:c[0],passed:c[1]};}) };
  }
  global.runPhase521ControlledCloudActivation = evaluate;
})(window);
