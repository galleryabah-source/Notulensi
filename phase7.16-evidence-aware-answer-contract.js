/* Phase 7.16 — Evidence-aware AI Answer Contract */
(function (global) {
  'use strict';
  function prepare(ownerId, question, context, citations){
    if(!ownerId||!String(question||'').trim())return {phase:'7.16',status:'BLOCKED',reason:'OWNER_AND_QUESTION_REQUIRED'};
    context=Array.isArray(context)?context:[]; citations=Array.isArray(citations)?citations:[];
    const allowedIds={}; context.forEach(c=>{if(c&&c.id&&String(c.ownerId)===String(ownerId))allowedIds[String(c.id)]=true;});
    const evidence=citations.filter(c=>c&&allowedIds[String(c.knowledgeId)]).map(c=>({knowledgeId:String(c.knowledgeId),sourceId:c.sourceId||null,locator:c.locator||null,confidence:c.confidence==null?null:Math.max(0,Math.min(1,Number(c.confidence)))}));
    return {phase:'7.16',status:'ANSWER_CONTEXT_READY',ownerId:String(ownerId),question:String(question).trim(),context,evidence,requiresEvidence:true,networkCalled:false};
  }
  global.phase716EvidenceAwareAnswer={prepare};
})(window);
