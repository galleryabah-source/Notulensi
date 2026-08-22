/* Phase 14.6 — AI Provider Server Adapter */
(function (global) {
  'use strict';
  function prepare(input){
    input=input||{};
    const required=['provider','model','requestId','ownerId'];
    const missing=required.filter(k=>!String(input[k]||'').trim());
    if(missing.length)return {phase:'14.6',status:'BLOCKED',reason:'AI_REQUEST_METADATA_REQUIRED',missing};
    if(input.authenticated!==true||input.authorized!==true)return {phase:'14.6',status:'BLOCKED',reason:'AI_AUTHORIZATION_REQUIRED'};
    return {phase:'14.6',status:'AI_PROVIDER_ADAPTER_READY',provider:String(input.provider),model:String(input.model),requestId:String(input.requestId),ownerId:String(input.ownerId),serverSideOnly:true,secretSource:'SERVER_SECRET_STORE',clientSecretExposure:false,directClientProviderCall:false,mutationEnabled:false};
  }
  global.phase146AIProviderServerAdapter={prepare};
})(window);
