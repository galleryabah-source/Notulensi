/* Phase 6.14 — Follow-up Dashboard Model */
(function (global) {
  'use strict';
  function build(followUps) {
    followUps=Array.isArray(followUps)?followUps:[];
    const required=followUps.filter(f=>f&&f.status==='FOLLOW_UP_REQUIRED').length;
    const completed=followUps.filter(f=>f&&f.status==='COMPLETED').length;
    return {phase:'6.14',total:followUps.length,required,completed,pending:Math.max(0,required-completed)};
  }
  global.phase614FollowUpDashboard={build};
})(window);
