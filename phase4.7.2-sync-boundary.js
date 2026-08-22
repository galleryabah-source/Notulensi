(function(){
  'use strict';
  const KEY='meeting_ai_sync_queue_v472';
  function read(){ try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]} }
  function write(v){ localStorage.setItem(KEY, JSON.stringify(v)); return v; }
  function enqueue(envelope){
    if(!window.MeetingCanonicalContractV471?.validate(envelope?.entity)) throw new Error('INVALID_SYNC_ENVELOPE');
    const q=read();
    const item={id:'sync-'+Date.now()+'-'+Math.random().toString(36).slice(2,8),status:'pending',attempts:0,createdAt:new Date().toISOString(),envelope};
    q.push(item); write(q); return item;
  }
  function peek(limit=25){ return read().filter(x=>x.status==='pending').slice(0,limit); }
  function mark(id,status,error){ const q=read(); const i=q.findIndex(x=>x.id===id); if(i<0)return null; q[i].status=status; q[i].attempts=(q[i].attempts||0)+(status==='failed'?1:0); q[i].lastError=error||null; q[i].updatedAt=new Date().toISOString(); write(q); return q[i]; }
  function stats(){ const q=read(); return {total:q.length,pending:q.filter(x=>x.status==='pending').length,failed:q.filter(x=>x.status==='failed').length,done:q.filter(x=>x.status==='done').length}; }
  window.MeetingSyncBoundaryV472={KEY,enqueue,peek,mark,stats,read,write};
})();