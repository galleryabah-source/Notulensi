/* Phase 13.5 — Real AI Provider Runtime Boundary */
(function (global) {
  'use strict';
  function prepare(input){
    input=input||{};
    const required=['provider','model','ownerId','requestId'];
    const missing=required.filter(k=>!String(input[k]||'').trim());
    if(missing.length)return {phase:'13.5',status:'BLOCKED',reason:'AI_RUNTIME_METADATA_REQUIRED',missing};
    return {phase:'13.5',status:'AI_PROVIDER_RUNTIME_READY',provider:String(input.provider),model:String(input.model),ownerId:String(input.ownerId),requestId:String(input.requestId),serverSideOnly:true,secretFromClient:false,secretFromRepository:false,clientDirectCall:false,executionEnabled:false};
  }
  global.phase135AIProviderRuntime={prepare};
})(window);
