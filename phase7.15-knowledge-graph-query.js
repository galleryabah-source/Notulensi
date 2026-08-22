/* Phase 7.15 — Knowledge Graph Query */
(function (global) {
  'use strict';
  function query(ownerId, fromId, relation, links){
    if(!ownerId||!fromId)return {phase:'7.15',status:'BLOCKED',reason:'OWNER_AND_NODE_REQUIRED'};
    links=Array.isArray(links)?links:[];
    const results=links.filter(l=>l&&String(l.ownerId)===String(ownerId)&&String(l.fromId)===String(fromId)&&(!relation||l.relation===relation));
    return {phase:'7.15',status:'GRAPH_QUERY_READY',results,networkCalled:false};
  }
  global.phase715KnowledgeGraphQuery={query};
})(window);
