/* PHASE 4.7 — Cloud Foundation Self-Test
 * Non-destructive: exercises only the new adapter with a temporary key.
 */
(function(){
  'use strict';
  async function run(){
    const checks=[];
    const add=(id,ok,detail)=>checks.push({id,ok:Boolean(ok),detail:String(detail||'')});
    const api=window.meetingStorageV47;
    add('adapter-api',!!api,'Storage adapter is exposed.');
    add('local-active',api?.info?.().activeAdapter==='local','Local adapter remains default.');
    if(api){
      const key='__phase47_selftest__';
      try{
        await api.set(key,'ok');
        const value=await api.get(key);
        add('roundtrip',value==='ok','Temporary local adapter round-trip.');
        await api.remove(key);
        add('cleanup',await api.get(key)===null,'Temporary test key removed.');
      }catch(e){add('roundtrip',false,e.message);try{localStorage.removeItem(key);}catch(_) {}}
    }
    add('migration-api',typeof window.inspectPhase47Migration==='function','Migration manifest API is exposed.');
    const result={version:'4.7.0',at:new Date().toISOString(),checks,pass:checks.every(x=>x.ok)};
    window.phase47FoundationSelfTestResult=result;
    return result;
  }
  window.runPhase47FoundationSelfTest=run;
})();
