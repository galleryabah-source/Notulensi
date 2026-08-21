/* Phase 17.8 — Canary Acceptance */
(function(global){'use strict';
function evaluate(i){i=i||{};const c={trafficScoped:i.trafficScoped===true,shadowStable:i.shadowStable===true,healthStable:i.healthStable===true,errorBudgetStable:i.errorBudgetStable===true,dataParity:i.dataParity===true,rollbackReady:i.rollbackReady===true,observationWindowComplete:i.observationWindowComplete===true};const passed=Object.values(c).every(Boolean);return {phase:'17.8',status:passed?'CANARY_ACCEPTED':'CANARY_ACCEPTANCE_BLOCKED',passed,fullTrafficNotImplied:true,checks:c};}
global.phase178CanaryAcceptance={evaluate};})(window);
