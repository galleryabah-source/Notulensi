/* Phase 7.13 — Hybrid Knowledge Search */
(function (global) {
  'use strict';
  function search(query, lexical, semantic){
    query=query||{}; lexical=Array.isArray(lexical)?lexical:[]; semantic=Array.isArray(semantic)?semantic:[];
    if(!query.ownerId||!String(query.text||'').trim())return {phase:'7.13',status:'BLOCKED',reason:'QUERY_REQUIRED'};
    const merged={}; lexical.concat(semantic).forEach(function(r){if(r&&r.id&&String(r.ownerId)===String(query.ownerId)){const key=String(r.id);merged[key]=Object.assign({},merged[key],r, {hybridScore:Math.max(Number(merged[key]&&merged[key].hybridScore)||0,Number(r.hybridScore||r.score||0))});}});
    const results=Object.keys(merged).map(k=>merged[k]).sort((a,b)=>b.hybridScore-a.hybridScore).slice(0,Math.max(1,Math.min(50,Number(query.topK)||10)));
    return {phase:'7.13',status:'RETRIEVED',results,networkCalled:false};
  }
  global.phase713HybridKnowledgeSearch={search};
})(window);
