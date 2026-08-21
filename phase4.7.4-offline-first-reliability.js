(function(){
  'use strict';
  function online(){ return typeof navigator==='undefined' ? true : navigator.onLine !== false; }
  function canSync(){ return online() && !!window.MeetingSyncBoundaryV472; }
  function enqueueContract(contract,operation){
    if(!window.MeetingSyncBoundaryV472) throw new Error('SYNC_BOUNDARY_UNAVAILABLE');
    const env=window.MeetingCanonicalContractV471.createSyncEnvelope(contract,operation);
    return window.MeetingSyncBoundaryV472.enqueue(env);
  }
  function retryable(error){
    const s=String(error?.code||error?.message||error||'').toUpperCase();
    return !['VALIDATION','UNAUTHORIZED','FORBIDDEN','CONFLICT'].some(x=>s.includes(x));
  }
  function selfTest(){
    const c=window.MeetingCanonicalContractV471?.contract('meeting',{id:'phase474-test',title:'temporary'}, {id:'phase474-test'});
    const valid=!!c && window.MeetingCanonicalContractV471.validate(c);
    const queued=valid ? enqueueContract(c,'upsert') : null;
    if(queued) window.MeetingSyncBoundaryV472.mark(queued.id,'done');
    return {ok:valid && !!queued, online:online(), queueAvailable:!!window.MeetingSyncBoundaryV472};
  }
  window.MeetingOfflineFirstV474={online,canSync,enqueueContract,retryable,selfTest};
})();