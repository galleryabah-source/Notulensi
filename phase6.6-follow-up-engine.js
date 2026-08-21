/* Phase 6.6 — Follow-up Engine */
(function (global) {
  'use strict';
  function plan(action, decision) {
    action=action||{}; decision=decision||{};
    if(!action.id) return {phase:'6.6',status:'BLOCKED',reason:'ACTION_ID_REQUIRED'};
    if(String(action.status||'')==='done') return {phase:'6.6',status:'NO_FOLLOW_UP',reason:'ACTION_COMPLETED'};
    return {phase:'6.6',status:'FOLLOW_UP_REQUIRED',actionId:String(action.id),meetingId:action.meetingId?String(action.meetingId):null,assigneeId:action.assigneeId?String(action.assigneeId):null,decisionId:decision.id?String(decision.id):null,nextStep:'REVIEW_STATUS_AND_CONTACT_ASSIGNEE'};
  }
  global.phase66FollowUpEngine={plan};
})(window);
