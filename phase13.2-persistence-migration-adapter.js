/* Phase 13.2 — Persistence Migration Adapter */
(function (global) {
  'use strict';
  function prepare(input){
    input=input||{};
    const required=['ownerId','legacySource','targetStore'];
    const missing=required.filter(k=>!String(input[k]||'').trim());
    if(missing.length)return {phase:'13.2',status:'BLOCKED',reason:'MIGRATION_METADATA_REQUIRED',missing};
    return {phase:'13.2',status:'MIGRATION_PLAN_READY',ownerId:String(input.ownerId),legacySource:String(input.legacySource),targetStore:String(input.targetStore),readLegacy:true,writeTarget:true,verifyBeforeCutover:true,backupBeforeWrite:true,rollbackOnMismatch:true,destructiveMigration:false,cutoverEnabled:false};
  }
  global.phase132PersistenceMigrationAdapter={prepare};
})(window);
