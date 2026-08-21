/* Phase 9.6 — Transaction Integration */
(function (global) {
  'use strict';
  function prepare(input){
    input=input||{};
    const required=['ownerId','requestId','actionId','idempotencyKey'];
    const missing=required.filter(k=>!String(input[k]||'').trim());
    if(missing.length)return {phase:'9.6',status:'BLOCKED',reason:'TRANSACTION_METADATA_REQUIRED',missing};
    return {phase:'9.6',status:'TRANSACTION_READY',ownerId:String(input.ownerId),requestId:String(input.requestId),actionId:String(input.actionId),idempotencyKey:String(input.idempotencyKey),atomic:true,duplicatePolicy:'RETURN_PREVIOUS_RESULT',rollbackOnFailure:true,networkCalled:false};
  }
  global.phase96TransactionIntegration={prepare};
})(window);
