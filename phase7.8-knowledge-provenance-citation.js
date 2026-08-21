/* Phase 7.8 — Knowledge Provenance & Citation Layer */
(function (global) {
  'use strict';
  function cite(item){
    if(!item||!item.id||!item.sourceId)return {phase:'7.8',status:'BLOCKED',reason:'ITEM_AND_SOURCE_REQUIRED'};
    return {phase:'7.8',status:'CITATION_READY',citation:{knowledgeId:String(item.id),sourceId:String(item.sourceId),sourceType:item.sourceType||null,locator:item.locator||null,confidence:item.confidence==null?null:Math.max(0,Math.min(1,Number(item.confidence)))}};
  }
  function attach(items){return (Array.isArray(items)?items:[]).map(cite);}
  global.phase78KnowledgeProvenance={cite,attach};
})(window);
