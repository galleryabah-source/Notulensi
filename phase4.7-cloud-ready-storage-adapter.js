/* Meeting Intelligence Ultimate — PHASE 4.7
 * Cloud-ready Storage Adapter
 * Local-first compatibility layer. No existing storage keys are removed.
 */
(function(){
  'use strict';
  const VERSION='4.7.0';
  const NAMESPACE='meeting-intelligence';
  const adapters={};
  let active='local';
  function register(name,adapter){
    if(!name||!adapter||typeof adapter.get!=='function'||typeof adapter.set!=='function') throw new Error('Invalid storage adapter.');
    adapters[name]=adapter;
  }
  function use(name){
    if(!adapters[name]) throw new Error('Storage adapter not registered: '+name);
    active=name;
    return active;
  }
  const local={
    async get(key){try{return localStorage.getItem(key);}catch(e){return null;}},
    async set(key,value){localStorage.setItem(key,String(value));return true;},
    async remove(key){localStorage.removeItem(key);return true;}
  };
  register('local',local);
  async function get(key){return adapters[active].get(key);}
  async function set(key,value){return adapters[active].set(key,value);}
  async function remove(key){return typeof adapters[active].remove==='function'?adapters[active].remove(key):false;}
  function info(){return {version:VERSION,namespace:NAMESPACE,activeAdapter:active,registered:Object.keys(adapters),localFirst:true};}
  window.meetingStorageV47={register,use,get,set,remove,info};
  window.meetingStorageV47.info=info;
})();
