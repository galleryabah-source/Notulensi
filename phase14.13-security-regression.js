/* Phase 14.13 — Security Regression */
(function (global) {
  'use strict';
  function run(input){
    input=input||{};
    const checks={ownerIsolation:input.ownerIsolation===true,denyByDefault:input.denyByDefault===true,clientCannotUseProviderSecret:input.clientCannotUseProviderSecret===true,unauthorizedCannotPersist:input.unauthorizedCannotPersist===true,duplicateRequestsIdempotent:input.duplicateRequestsIdempotent===true,sensitiveDataRedacted:input.sensitiveDataRedacted===true,auditIntegrity:input.auditIntegrity===true,csrfProtected:input.csrfProtected===true,rateLimitEnforced:input.rateLimitEnforced===true};
    const passed=Object.values(checks).every(Boolean);
    return {phase:'14.13',status:passed?'SECURITY_REGRESSION_PASSED':'SECURITY_REGRESSION_BLOCKED',passed,failClosed:true,productionMutationAllowed:false,checks};
  }
  global.phase1413SecurityRegression={run};
})(window);
