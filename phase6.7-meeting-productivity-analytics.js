/* Phase 6.7 — Meeting Productivity Analytics */
(function (global) {
  'use strict';
  function analyze(actions, decisions, followUps) {
    actions=Array.isArray(actions)?actions:[]; decisions=Array.isArray(decisions)?decisions:[]; followUps=Array.isArray(followUps)?followUps:[];
    const total=actions.length, done=actions.filter(a=>a&&a.status==='done').length, overdue=actions.filter(a=>a&&a.status==='overdue').length;
    const completionRate=total?Math.round((done/total)*100):0;
    const decisionCount=decisions.length;
    const followUpRequired=followUps.filter(f=>f&&f.status==='FOLLOW_UP_REQUIRED').length;
    return {phase:'6.7',metrics:{actionCount:total,completedActions:done,overdueActions:overdue,actionCompletionRate:completionRate,decisionCount,followUpRequired},status:total===0?'NO_ACTION_DATA':'ANALYZED'};
  }
  global.phase67MeetingProductivityAnalytics={analyze};
})(window);
