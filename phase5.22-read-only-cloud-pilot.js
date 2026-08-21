/* Phase 5.22 — Read-only Cloud Pilot */
(function (global) {
  'use strict';
  async function run(identity, adapter, resource) {
    if (!identity || !identity.userId) return {phase:'5.22',status:'BLOCKED',reason:'AUTH_REQUIRED',writeAttempted:false,deleteAttempted:false};
    if (!adapter || typeof adapter.list !== 'function') return {phase:'5.22',status:'BLOCKED',reason:'ADAPTER_REQUIRED',writeAttempted:false,deleteAttempted:false};
    try {
      const result = await adapter.list(resource || 'meetings');
      return {phase:'5.22',status:'READ_ONLY_SUCCESS',writeAttempted:false,deleteAttempted:false,result};
    } catch (error) {
      return {phase:'5.22',status:'READ_ONLY_FAILED',writeAttempted:false,deleteAttempted:false,error:String(error&&error.message||error)};
    }
  }
  global.runPhase522ReadOnlyCloudPilot = run;
})(window);
