/* Phase 5.20 — Database Runtime Validation */
(function (global) {
  'use strict';
  async function run(adapter) {
    const checks=[];
    checks.push({name:'adapter available',passed:!!adapter});
    if(adapter && typeof adapter.list==='function') {
      try { await adapter.list('meetings'); checks.push({name:'list callable',passed:true}); }
      catch(error){ checks.push({name:'list callable',passed:false,error:String(error&&error.message||error)}); }
    } else checks.push({name:'list callable',passed:false});
    return {phase:'5.20',networkMayBeCalled:!!adapter,destructive:false,passed:checks.every(function(c){return c.passed;}),checks};
  }
  global.runPhase520DatabaseRuntimeValidation=run;
})(window);
