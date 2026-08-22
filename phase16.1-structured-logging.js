/* Phase 16.1 — Structured Logging */
(function(global){'use strict';
const levels=['debug','info','warn','error'];
function validate(i){i=i||{};const c={level:levels.includes(String(i.level||'')),timestamp:Boolean(i.timestamp),requestId:Boolean(String(i.requestId||'').trim()),service:Boolean(String(i.service||'').trim()),environment:Boolean(String(i.environment||'').trim()),redacted:i.redacted===true,noSecrets:i.noSecrets===true};return {phase:'16.1',status:Object.values(c).every(Boolean)?'STRUCTURED_LOGGING_READY':'STRUCTURED_LOGGING_BLOCKED',passed:Object.values(c).every(Boolean),checks:c};}
global.phase161StructuredLogging={levels,validate};})(window);
