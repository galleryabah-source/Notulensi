/* Phase 7.4 — Knowledge Linking Engine */
(function (global) {
  'use strict';
  const RELATIONS=['about','derived_from','mentions','decided_by','assigned_to','related_to','part_of'];
  function link(input){
    input=input||{};
    if(!input.ownerId||!input.fromId||!input.toId)return {phase:'7.4',status:'BLOCKED',reason:'OWNER_AND_ENDPOINTS_REQUIRED'};
    if(!RELATIONS.includes(input.relation))return {phase:'7.4',status:'BLOCKED',reason:'RELATION_NOT_ALLOWED'};
    if(String(input.fromId)===String(input.toId))return {phase:'7.4',status:'BLOCKED',reason:'SELF_LINK_NOT_ALLOWED'};
    return {phase:'7.4',status:'LINK_VALID',networkCalled:false,link:{ownerId:String(input.ownerId),fromId:String(input.fromId),toId:String(input.toId),relation:input.relation,confidence:Math.max(0,Math.min(1,Number(input.confidence)==null?1:Number(input.confidence)))}};
  }
  global.phase74KnowledgeLinking={RELATIONS,link};
})(window);
