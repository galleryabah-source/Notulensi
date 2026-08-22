/* Phase 8.3 — Context Orchestration */
(function (global) {
  'use strict';
  function build(input){
    input=input||{};
    if(!input.ownerId||!input.intent)return {phase:'8.3',status:'BLOCKED',reason:'OWNER_AND_INTENT_REQUIRED'};
    const knowledge=Array.isArray(input.knowledge)?input.knowledge:[];
    const meetings=Array.isArray(input.meetings)?input.meetings:[];
    const actions=Array.isArray(input.actions)?input.actions:[];
    const decisions=Array.isArray(input.decisions)?input.decisions:[];
    return {phase:'8.3',status:'CONTEXT_ORCHESTRATED',ownerId:String(input.ownerId),intent:input.intent,knowledge:knowledge.filter(x=>x&&String(x.ownerId)===String(input.ownerId)),meetings,actions,decisions,networkCalled:false};
  }
  global.phase83ContextOrchestration={build};
})(window);
