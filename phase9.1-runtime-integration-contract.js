/* Phase 9.1 — Runtime Integration Contract */
(function (global) {
  'use strict';
  function prepare(input){
    input=input||{};
    const required=['ownerId','requestId','route','method'];
    const missing=required.filter(k=>!String(input[k]||'').trim());
    if(missing.length)return {phase:'9.1',status:'BLOCKED',reason:'RUNTIME_METADATA_REQUIRED',missing};
    return {phase:'9.1',status:'RUNTIME_REQUEST_READY',ownerId:String(input.ownerId),requestId:String(input.requestId),route:String(input.route),method:String(input.method).toUpperCase(),networkCalled:false};
  }
  global.phase91RuntimeIntegration={prepare};
})(window);
