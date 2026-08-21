(function(){
  'use strict';
  function compare(local,incoming){
    if(!local) return 'accept-incoming';
    if(!incoming) return 'keep-local';
    if(local.fingerprint && incoming.fingerprint && local.fingerprint===incoming.fingerprint) return 'identical';
    const lr=Number(local.revision||0), ir=Number(incoming.revision||0);
    if(ir>lr) return 'accept-incoming';
    if(ir<lr) return 'keep-local';
    const lu=Date.parse(local.updatedAt||0), iu=Date.parse(incoming.updatedAt||0);
    if(iu>lu) return 'accept-incoming';
    if(iu<lu) return 'keep-local';
    return 'manual-review';
  }
  function resolve(local,incoming){
    const decision=compare(local,incoming);
    return {decision, resolved:decision!=='manual-review', requiresReview:decision==='manual-review', localRevision:Number(local?.revision||0), incomingRevision:Number(incoming?.revision||0)};
  }
  window.MeetingConflictPolicyV473={compare,resolve};
})();