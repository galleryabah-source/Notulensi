/* Phase 7.12 — Knowledge Cloud Mapping */
(function (global) {
  'use strict';
  const allowed={objects:['id','ownerId','type','title','sourceId','createdAt','updatedAt'],links:['ownerId','fromId','toId','relation','confidence'],sources:['id','ownerId','type','title','externalId'],citations:['knowledgeId','sourceId','sourceType','locator','confidence']};
  function map(resource,record){
    if(!allowed[resource])return {phase:'7.12',status:'RESOURCE_NOT_ALLOWED'};
    if(!record||!record.ownerId)return {phase:'7.12',status:'OWNER_ID_REQUIRED'};
    const payload={}; allowed[resource].forEach(k=>{if(record[k]!==undefined)payload[k]=record[k];});
    return {phase:'7.12',status:'MAPPED',resource,payload,networkCalled:false};
  }
  global.phase712KnowledgeCloudMapping={allowed,map};
})(window);
