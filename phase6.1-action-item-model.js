/* Phase 6.1 — Action Item Model
 * Pure model/normalizer. Does not modify existing meeting data.
 */
(function (global) {
  'use strict';
  const STATUSES=['open','in_progress','blocked','done','cancelled'];
  function create(input) {
    input=input||{};
    if(!input.title) throw new Error('ACTION_TITLE_REQUIRED');
    return {
      id:String(input.id||('action_'+Date.now()+'_'+Math.random().toString(36).slice(2,8))),
      meetingId:input.meetingId==null?null:String(input.meetingId),
      ownerId:input.ownerId==null?null:String(input.ownerId),
      title:String(input.title),
      description:String(input.description||''),
      assigneeId:input.assigneeId==null?null:String(input.assigneeId),
      dueAt:input.dueAt||null,
      priority:String(input.priority||'normal'),
      status:STATUSES.includes(input.status)?input.status:'open',
      createdAt:input.createdAt||new Date().toISOString(),
      updatedAt:new Date().toISOString()
    };
  }
  global.phase61ActionItemModel={statuses:STATUSES.slice(),create};
})(window);
