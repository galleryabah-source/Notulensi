/* Phase 6.15 — Meeting Effectiveness Score */
(function (global) {
  'use strict';
  function score(metrics) {
    metrics=metrics||{};
    const completion=Math.max(0,Math.min(100,Number(metrics.actionCompletionRate)||0));
    const decisionFollowThrough=Math.max(0,Math.min(100,Number(metrics.decisionFollowThroughRate==null?completion:metrics.decisionFollowThroughRate)||0));
    const followUp=Math.max(0,Math.min(100,Number(metrics.followUpCompletionRate==null?completion:metrics.followUpCompletionRate)||0));
    const overduePenalty=Math.max(0,Math.min(100,Number(metrics.overdueRate)||0));
    const raw=(completion*0.45)+(decisionFollowThrough*0.30)+(followUp*0.25)-(overduePenalty*0.20);
    const value=Math.round(Math.max(0,Math.min(100,raw)));
    return {phase:'6.15',score:value,band:value>=80?'HIGH':value>=60?'MEDIUM':'LOW',inputs:{completion,decisionFollowThrough,followUp,overduePenalty}};
  }
  global.phase615MeetingEffectiveness={score};
})(window);
