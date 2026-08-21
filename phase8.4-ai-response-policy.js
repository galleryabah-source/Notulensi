/* Phase 8.4 — AI Response Policy */
(function (global) {
  'use strict';
  const ACTION_INTENTS=['task_planning'];
  function evaluate(input){
    input=input||{};
    const evidence=Array.isArray(input.evidence)?input.evidence:[];
    const intent=String(input.intent||'question');
    const canAnswer=evidence.length>0||!['decision_lookup','action_lookup','person_lookup','topic_lookup'].includes(intent);
    return {phase:'8.4',status:canAnswer?'RESPONSE_ALLOWED':'EVIDENCE_REQUIRED',intent,requiresEvidence:['decision_lookup','action_lookup','person_lookup','topic_lookup','meeting_summary'].includes(intent),canProposeActions:ACTION_INTENTS.includes(intent),canExecuteActions:false,networkCalled:false};
  }
  global.phase84AIResponsePolicy={evaluate};
})(window);
