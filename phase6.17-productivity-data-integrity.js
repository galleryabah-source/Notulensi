/* Phase 6.17 — Productivity Data Integrity */
(function (global) {
  'use strict';
  function validateAction(action){
    return !!(action&&action.id&&action.meetingId&&action.ownerId&&action.title);
  }
  function validateDecision(decision){
    return !!(decision&&decision.id&&decision.meetingId&&decision.ownerId&&decision.title);
  }
  function validate(actions,decisions){
    actions=Array.isArray(actions)?actions:[]; decisions=Array.isArray(decisions)?decisions:[];
    const invalidActions=actions.filter(a=>!validateAction(a)).length;
    const invalidDecisions=decisions.filter(d=>!validateDecision(d)).length;
    return {phase:'6.17',passed:invalidActions===0&&invalidDecisions===0,invalidActions,invalidDecisions};
  }
  global.phase617ProductivityIntegrity={validate,validateAction,validateDecision};
})(window);
