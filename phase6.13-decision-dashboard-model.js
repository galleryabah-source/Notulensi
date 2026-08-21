/* Phase 6.13 — Decision Dashboard Model */
(function (global) {
  'use strict';
  function build(decisions) {
    decisions=Array.isArray(decisions)?decisions:[];
    const byStatus={open:0,confirmed:0,rejected:0,superseded:0};
    decisions.forEach(function(d){if(d&&Object.prototype.hasOwnProperty.call(byStatus,d.status))byStatus[d.status]++;});
    return {phase:'6.13',total:decisions.length,byStatus};
  }
  global.phase613DecisionDashboard={build};
})(window);
