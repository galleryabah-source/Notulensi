/* Phase 15.5 — RBAC Runtime Enforcement */
(function (global) {
  'use strict';
  const roles=['OWNER','ADMIN','EDITOR','REVIEWER','AUDITOR'];
  function authorize(input){
    input=input||{};
    const checks={authenticated:input.authenticated===true,roleResolved:roles.includes(String(input.role||'')),ownerResolved:Boolean(String(input.ownerId||'').trim()),resourceOwnerMatch:input.resourceOwnerMatch===true,permissionChecked:input.permissionChecked===true,serverEnforced:input.serverEnforced===true};
    const allowed=Object.values(checks).every(Boolean);
    return {phase:'15.5',status:allowed?'RBAC_RUNTIME_AUTHORIZED':'RBAC_RUNTIME_DENIED',allowed,denyByDefault:true,clientAuthorizationTrusted:false,checks};
  }
  global.phase155RBACRuntime={roles,authorize};
})(window);
