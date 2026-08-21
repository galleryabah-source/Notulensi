/* Phase 5.15 — User Account Runtime
 * Local runtime state only. No credentials or access tokens are persisted here.
 */
(function (global) {
  'use strict';
  const KEY = 'meeting_ai_account_runtime_v515';
  function get(){ try{return JSON.parse(localStorage.getItem(KEY)||'null');}catch(_){return null;} }
  function set(account){
    if(!account || !account.userId) throw new Error('ACCOUNT_USER_ID_REQUIRED');
    const safe={userId:String(account.userId),provider:String(account.provider||'none'),displayName:String(account.displayName||''),email:String(account.email||''),updatedAt:new Date().toISOString()};
    localStorage.setItem(KEY,JSON.stringify(safe)); return safe;
  }
  function clear(){localStorage.removeItem(KEY);}
  global.phase515UserAccountRuntime={key:KEY,get,set,clear};
})(window);
