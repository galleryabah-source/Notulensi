/* Phase 7.1 — Knowledge Object Model */
(function (global) {
  'use strict';
  const TYPES=['meeting','note','decision','action','document','topic','person','project'];
  function create(input){
    input=input||{};
    if(!input.id)return {phase:'7.1',status:'BLOCKED',reason:'KNOWLEDGE_ID_REQUIRED'};
    if(!input.ownerId)return {phase:'7.1',status:'BLOCKED',reason:'OWNER_ID_REQUIRED'};
    if(!TYPES.includes(input.type))return {phase:'7.1',status:'BLOCKED',reason:'KNOWLEDGE_TYPE_NOT_ALLOWED'};
    return {phase:'7.1',status:'VALID',object:{id:String(input.id),ownerId:String(input.ownerId),type:input.type,title:String(input.title||''),sourceId:input.sourceId||null,createdAt:input.createdAt||new Date().toISOString(),updatedAt:input.updatedAt||new Date().toISOString()}};
  }
  global.phase71KnowledgeObjectModel={TYPES,create};
})(window);
