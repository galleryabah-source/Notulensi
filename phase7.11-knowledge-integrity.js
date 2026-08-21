/* Phase 7.11 — Knowledge Integrity */
(function (global) {
  'use strict';
  function validateObject(o){return !!(o&&o.id&&o.ownerId&&o.type&&o.sourceId);}
  function validateLink(l){return !!(l&&l.ownerId&&l.fromId&&l.toId&&l.relation&&String(l.fromId)!==String(l.toId));}
  function validate(objects,links){
    objects=Array.isArray(objects)?objects:[]; links=Array.isArray(links)?links:[];
    const invalidObjects=objects.filter(o=>!validateObject(o)).length;
    const invalidLinks=links.filter(l=>!validateLink(l)).length;
    return {phase:'7.11',passed:invalidObjects===0&&invalidLinks===0,invalidObjects,invalidLinks};
  }
  global.phase711KnowledgeIntegrity={validate,validateObject,validateLink};
})(window);
