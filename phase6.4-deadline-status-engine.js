/* Phase 6.4 — Deadline & Status Engine */
(function (global) {
  'use strict';
  function evaluate(action, now) {
    action=action||{}; now=now?new Date(now):new Date();
    const due=action.dueAt?new Date(action.dueAt):null;
    if(!due || Number.isNaN(due.getTime())) return {phase:'6.4',status:'NO_DEADLINE',overdue:false,dueSoon:false};
    const terminal=['done','cancelled'];
    if(terminal.indexOf(String(action.status||''))>=0) return {phase:'6.4',status:'TERMINAL',overdue:false,dueSoon:false};
    const diff=due.getTime()-now.getTime();
    return {phase:'6.4',status:diff<0?'OVERDUE':(diff<=86400000?'DUE_SOON':'ON_TRACK'),overdue:diff<0,dueSoon:diff>=0&&diff<=86400000,dueAt:due.toISOString()};
  }
  global.phase64DeadlineStatusEngine={evaluate};
})(window);
