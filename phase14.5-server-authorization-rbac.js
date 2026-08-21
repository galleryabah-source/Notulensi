/* Phase 14.5 — Server Authorization / RBAC Boundary */
(function (global) {
  'use strict';
  const roles=['OWNER','ADMIN','EDITOR','REVIEWER','AUDITOR'];
  function authorize(input){
    input=input||{};
    const checks={
      authenticated:input.authenticated===true,
      roleKnown:roles.includes(String(input.role||'')),
      resourceOwned:input.resourceOwned===true,
      policyAllows:input.policyAllows===true
    };
    const allowed=Object.values(checks).every(Boolean);
    return {phase:'14.5',status:allowed?'AUTHORIZED':'AUTHORIZATION_DENIED',allowed,roles,denyByDefault:true,clientOnlyAuthorizationAccepted:false,checks};
  }
  global.phase145ServerAuthorization={roles,authorize};
})(window);
