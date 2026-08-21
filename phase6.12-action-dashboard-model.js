/* Phase 6.12 — Action Dashboard Model */
(function (global) {
  'use strict';
  function build(actions) {
    actions=Array.isArray(actions)?actions:[];
    const byStatus={open:0,in_progress:0,blocked:0,done:0,cancelled:0};
    actions.forEach(function(a){if(a&&Object.prototype.hasOwnProperty.call(byStatus,a.status))byStatus[a.status]++;});
    return {phase:'6.12',total:actions.length,byStatus,overdue:actions.filter(a=>a&&a.status==='overdue').length};
  }
  global.phase612ActionDashboard={build};
})(window);
