/* Phase 6.5 — Reminder Engine */
(function (global) {
  'use strict';
  function plan(action, now) {
    action=action||{}; now=now?new Date(now):new Date();
    if(!action.id || !action.dueAt) return {phase:'6.5',status:'NOT_SCHEDULED',reasons:['ACTION_OR_DEADLINE_MISSING']};
    const due=new Date(action.dueAt);
    if(Number.isNaN(due.getTime())) return {phase:'6.5',status:'NOT_SCHEDULED',reasons:['INVALID_DEADLINE']};
    if(['done','cancelled'].indexOf(String(action.status||''))>=0) return {phase:'6.5',status:'NOT_SCHEDULED',reasons:['TERMINAL_ACTION']};
    const offsets=[7*86400000,3*86400000,86400000];
    const reminders=offsets.map(function(offset){return {actionId:String(action.id),scheduledAt:new Date(due.getTime()-offset).toISOString(),type:'deadline'};}).filter(function(r){return new Date(r.scheduledAt)>now;});
    return {phase:'6.5',status:reminders.length?'SCHEDULED':'NO_FUTURE_REMINDER',reminders};
  }
  global.phase65ReminderEngine={plan};
})(window);
