/* Phase 7.2 — Knowledge Extraction Contract */
(function (global) {
  'use strict';
  const ALLOWED=['summary','topic','decision','action','person','project','keyword'];
  function extract(sourceId, ownerId, candidates){
    if(!sourceId||!ownerId)return {phase:'7.2',status:'BLOCKED',reason:'SOURCE_OR_OWNER_REQUIRED'};
    candidates=Array.isArray(candidates)?candidates:[];
    const accepted=candidates.filter(c=>c&&ALLOWED.includes(c.type)&&String(c.value||'').trim()).map(c=>({type:c.type,value:String(c.value).trim(),confidence:Math.max(0,Math.min(1,Number(c.confidence)==null?0:Number(c.confidence))),sourceId,ownerId}));
    return {phase:'7.2',status:'EXTRACTION_PLANNED',networkCalled:false,items:accepted};
  }
  global.phase72KnowledgeExtraction={ALLOWED,extract};
})(window);
