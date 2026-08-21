/* Phase 6.18 — Productivity Cloud Sync Mapping */
(function (global) {
  'use strict';
  const allowed={actions:['id','meetingId','ownerId','title','description','assigneeId','dueAt','priority','status','createdAt','updatedAt'],decisions:['id','meetingId','ownerId','title','description','status','decidedAt','updatedAt'],reminders:['id','actionId','ownerId','scheduledAt','status'],followUps:['id','meetingId','actionId','ownerId','status','createdAt','updatedAt']};
  function map(resource,record){
    if(!allowed[resource]) return {phase:'6.18',status:'RESOURCE_NOT_ALLOWED'};
    if(!record||!record.id||!record.ownerId) return {phase:'6.18',status:'OWNER_OR_ID_REQUIRED'};
    const out={}; allowed[resource].forEach(k=>{if(record[k]!==undefined)out[k]=record[k];});
    return {phase:'6.18',status:'MAPPED',resource,payload:out,networkCalled:false};
  }
  global.phase618ProductivityCloudMapping={allowed,map};
})(window);
