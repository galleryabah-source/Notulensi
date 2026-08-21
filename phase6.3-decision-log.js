/* Phase 6.3 — Decision Log */
(function (global) {
  'use strict';
  function create(input) {
    input=input||{};
    if(!input.id) throw new Error('DECISION_ID_REQUIRED');
    if(!input.meetingId) throw new Error('MEETING_ID_REQUIRED');
    if(!input.ownerId) throw new Error('OWNER_ID_REQUIRED');
    if(!input.title) throw new Error('DECISION_TITLE_REQUIRED');
    return {id:String(input.id),meetingId:String(input.meetingId),ownerId:String(input.ownerId),title:String(input.title),description:String(input.description||''),status:String(input.status||'active'),decidedAt:input.decidedAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
  }
  global.phase63DecisionLog={create};
})(window);
