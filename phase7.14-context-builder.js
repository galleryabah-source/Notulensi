/* Phase 7.14 — Knowledge Context Builder */
(function (global) {
  'use strict';
  function build(ownerId, query, results, options){
    if(!ownerId||!String(query||'').trim())return {phase:'7.14',status:'BLOCKED',reason:'OWNER_AND_QUERY_REQUIRED'};
    results=Array.isArray(results)?results:[]; options=options||{};
    const maxItems=Math.max(1,Math.min(20,Number(options.maxItems)||8));
    const context=results.filter(r=>r&&String(r.ownerId)===String(ownerId)&&r.id).slice(0,maxItems).map(r=>({id:String(r.id),type:r.type||null,title:r.title||'',content:r.content||'',sourceId:r.sourceId||null,score:Number(r.hybridScore||r.score||0)}));
    return {phase:'7.14',status:'CONTEXT_READY',ownerId:String(ownerId),query:String(query).trim(),items:context,networkCalled:false};
  }
  global.phase714KnowledgeContextBuilder={build};
})(window);
