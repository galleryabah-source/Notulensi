/* Phase 7.6 — Semantic Search Contract */
(function (global) {
  'use strict';
  function buildQuery(ownerId,text,options){
    if(!ownerId)return {phase:'7.6',status:'BLOCKED',reason:'OWNER_ID_REQUIRED'};
    if(!String(text||'').trim())return {phase:'7.6',status:'BLOCKED',reason:'QUERY_REQUIRED'};
    options=options||{};
    return {phase:'7.6',status:'QUERY_READY',query:{ownerId:String(ownerId),text:String(text).trim(),types:Array.isArray(options.types)?options.types:[],topK:Math.max(1,Math.min(50,Number(options.topK)||10)),threshold:Math.max(0,Math.min(1,Number(options.threshold)||0))},networkCalled:false};
  }
  global.phase76SemanticSearch={buildQuery};
})(window);
