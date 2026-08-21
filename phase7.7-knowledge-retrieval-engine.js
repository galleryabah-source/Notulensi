/* Phase 7.7 — Knowledge Retrieval Engine */
(function (global) {
  'use strict';
  function retrieve(query, candidates){
    if(!query||!query.ownerId||!query.text)return {phase:'7.7',status:'BLOCKED',reason:'QUERY_REQUIRED'};
    candidates=Array.isArray(candidates)?candidates:[];
    const types=Array.isArray(query.types)?query.types:[];
    const threshold=Number(query.threshold)||0;
    const matches=candidates.filter(c=>c&&String(c.ownerId)===String(query.ownerId)&&(!types.length||types.includes(c.type))&&Number(c.score||0)>=threshold).sort((a,b)=>Number(b.score||0)-Number(a.score||0)).slice(0,Number(query.topK)||10);
    return {phase:'7.7',status:'RETRIEVED',results:matches,networkCalled:false};
  }
  global.phase77KnowledgeRetrieval={retrieve};
})(window);
