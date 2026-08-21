/* Phase 11.2 — Source Integration Boundary */
(function (global) {
  'use strict';
  const ALLOWED=['ui','api','service','storage','ai-provider'];
  function prepare(input){
    input=input||{};
    const layer=String(input.layer||'').trim();
    if(!ALLOWED.includes(layer))return {phase:'11.2',status:'BLOCKED',reason:'INVALID_INTEGRATION_LAYER',allowedLayers:ALLOWED};
    return {phase:'11.2',status:'INTEGRATION_BOUNDARY_READY',layer,backwardCompatible:input.backwardCompatible!==false,mutationAllowed:false};
  }
  global.phase112SourceIntegrationBoundary={ALLOWED,prepare};
})(window);
