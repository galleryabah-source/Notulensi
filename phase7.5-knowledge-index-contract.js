/* Phase 7.5 — Knowledge Index Contract */
(function (global) {
  'use strict';
  const FIELDS=['title','content','type','ownerId','sourceId','updatedAt'];
  function index(record){
    if(!record||!record.id)return {phase:'7.5',status:'BLOCKED',reason:'KNOWLEDGE_ID_REQUIRED'};
    if(!record.ownerId)return {phase:'7.5',status:'BLOCKED',reason:'OWNER_ID_REQUIRED'};
    const document={id:String(record.id)}; FIELDS.forEach(k=>{if(record[k]!==undefined)document[k]=record[k];});
    return {phase:'7.5',status:'INDEX_READY',document,networkCalled:false};
  }
  global.phase75KnowledgeIndex={FIELDS,index};
})(window);
