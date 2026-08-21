/* Phase 10.2 — Observability Contract */
(function (global) {
  'use strict';
  const EVENTS=['request_started','request_completed','request_failed','ai_started','ai_completed','ai_failed','action_started','action_completed','action_failed','security_denied'];
  function record(input){
    input=input||{};
    if(!input.event||!EVENTS.includes(input.event))return {phase:'10.2',status:'BLOCKED',reason:'VALID_OBSERVABILITY_EVENT_REQUIRED'};
    return {phase:'10.2',status:'OBSERVABILITY_READY',event:input.event,requestId:input.requestId||null,ownerId:input.ownerId||null,durationMs:Number.isFinite(input.durationMs)?input.durationMs:null,metadata:input.metadata||{},sensitiveDataRedacted:true,persisted:false};
  }
  global.phase102Observability={EVENTS,record};
})(window);
