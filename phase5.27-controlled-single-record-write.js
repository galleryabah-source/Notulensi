/* Phase 5.27 — Controlled Single-record Write
 * Guarded write boundary. It never calls the adapter unless every prerequisite is true.
 */
(function (global) {
  'use strict';
  async function write(identity, record, adapter, approval) {
    if (!identity || !identity.userId) return {phase:'5.27',status:'BLOCKED',reason:'AUTH_REQUIRED',writeAttempted:false};
    if (approval !== true) return {phase:'5.27',status:'BLOCKED',reason:'EXPLICIT_APPROVAL_REQUIRED',writeAttempted:false};
    if (!record || !record.id) return {phase:'5.27',status:'BLOCKED',reason:'RECORD_ID_REQUIRED',writeAttempted:false};
    if (!adapter || typeof adapter.put !== 'function') return {phase:'5.27',status:'BLOCKED',reason:'WRITE_ADAPTER_REQUIRED',writeAttempted:false};
    const payload=Object.assign({},record,{ownerId:String(identity.userId)});
    try {
      const result=await adapter.put('meetings',record.id,payload);
      return {phase:'5.27',status:'WRITE_COMPLETED',writeAttempted:true,result,payload};
    } catch(error) {
      return {phase:'5.27',status:'WRITE_FAILED',writeAttempted:true,error:String(error&&error.message||error),payload};
    }
  }
  global.runPhase527ControlledSingleRecordWrite=write;
})(window);
