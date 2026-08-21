/* Phase 8.7 — AI Safety & Permission Boundary */
(function (global) {
  'use strict';
  const LEVELS={read:1,suggest:2,write:3,admin:4};
  function authorize(input){
    input=input||{};
    const required=LEVELS[input.requiredLevel]||LEVELS.write;
    const granted=LEVELS[input.grantedLevel]||0;
    const sameOwner=input.ownerId&&input.resourceOwnerId&&String(input.ownerId)===String(input.resourceOwnerId);
    const permitted=granted>=required&&sameOwner&&input.confirmed===true;
    return {phase:'8.7',status:permitted?'AUTHORIZED':'DENIED',permitted,reason:permitted?null:(sameOwner?'INSUFFICIENT_PERMISSION_OR_CONFIRMATION':'OWNER_SCOPE_MISMATCH'),canExecute:permitted};
  }
  global.phase87AIPermission={LEVELS,authorize};
})(window);
