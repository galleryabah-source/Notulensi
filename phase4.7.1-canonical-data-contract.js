(function(){
  'use strict';
  const VERSION = '4.7.1';
  const TYPES = ['meeting','document','revision','pack','governance'];
  function id(v){ return String(v ?? '').trim(); }
  function now(){ return new Date().toISOString(); }
  function stable(v){
    if(v === null || typeof v !== 'object') return JSON.stringify(v);
    if(Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
    return '{' + Object.keys(v).sort().map(k => JSON.stringify(k)+':'+stable(v[k])).join(',') + '}';
  }
  function contract(type, payload, meta){
    if(!TYPES.includes(type)) throw new Error('UNSUPPORTED_CONTRACT_TYPE');
    const m = meta || {};
    return {
      schema: 'meeting-intelligence', schemaVersion: VERSION, type,
      id: id(m.id || payload?.id),
      revision: Number(m.revision || 1),
      updatedAt: m.updatedAt || now(),
      source: m.source || 'local',
      payload: payload && typeof payload === 'object' ? JSON.parse(JSON.stringify(payload)) : payload
    };
  }
  function fingerprint(value){
    let h=2166136261;
    for(let i=0;i<stable(value).length;i++){ h^=stable(value).charCodeAt(i); h=Math.imul(h,16777619); }
    return ('00000000'+(h>>>0).toString(16)).slice(-8);
  }
  function validate(c){
    return !!(c && c.schema === 'meeting-intelligence' && c.schemaVersion && TYPES.includes(c.type) && c.id && Number.isInteger(c.revision) && c.revision > 0 && c.payload !== undefined);
  }
  function createSyncEnvelope(c, operation){
    if(!validate(c)) throw new Error('INVALID_CANONICAL_CONTRACT');
    return { envelopeVersion: VERSION, operation: operation || 'upsert', entity: c, fingerprint: fingerprint(c), createdAt: now() };
  }
  window.MeetingCanonicalContractV471 = { VERSION, TYPES, contract, validate, fingerprint, createSyncEnvelope, stable };
})();