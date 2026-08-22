/* Phase 6.9 — Action/Decision Persistence Contract */
(function (global) {
  'use strict';
  const resources=['actions','decisions','reminders','followUps'];
  function createKey(resource,id,ownerId){
    if(!resources.includes(resource)) throw new Error('RESOURCE_NOT_ALLOWED');
    if(!id) throw new Error('RECORD_ID_REQUIRED');
    if(!ownerId) throw new Error('OWNER_ID_REQUIRED');
    return 'user/'+String(ownerId)+'/'+resource+'/'+String(id);
  }
  global.phase69ProductivityPersistence={resources,createKey};
})(window);
