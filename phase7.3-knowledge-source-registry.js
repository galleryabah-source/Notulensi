/* Phase 7.3 — Knowledge Source Registry */
(function (global) {
  'use strict';
  const TYPES=['meeting','transcript','note','decision','action','document','import'];
  function register(source){
    source=source||{};
    if(!source.id)return {phase:'7.3',status:'BLOCKED',reason:'SOURCE_ID_REQUIRED'};
    if(!source.ownerId)return {phase:'7.3',status:'BLOCKED',reason:'OWNER_ID_REQUIRED'};
    if(!TYPES.includes(source.type))return {phase:'7.3',status:'BLOCKED',reason:'SOURCE_TYPE_NOT_ALLOWED'};
    return {phase:'7.3',status:'REGISTERED',source:{id:String(source.id),ownerId:String(source.ownerId),type:source.type,title:String(source.title||''),externalId:source.externalId||null}};
  }
  global.phase73KnowledgeSourceRegistry={TYPES,register};
})(window);
