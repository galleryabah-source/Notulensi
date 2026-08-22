/* Meeting Intelligence Ultimate — PHASE 4.7
 * Data Migration Manifest
 * Describes legacy/local data without moving or deleting it.
 */
(function(){
  'use strict';
  const VERSION='4.7.0';
  const KEYS=[
    'meetingHistory','meeting_ai_document_packs_v43','meeting_ai_document_governance_v46',
    'meeting_ai_governance_regression_v461'
  ];
  function inspect(){
    const items=KEYS.map(key=>{let present=false,size=0;try{const v=localStorage.getItem(key);present=v!==null;size=v?new Blob([v]).size:0;}catch(e){}return {key,present,sizeBytes:size};});
    const manifest={version:VERSION,at:new Date().toISOString(),source:'localStorage',readOnly:true,items};
    window.phase47MigrationManifest=manifest;
    return manifest;
  }
  function compatibility(){
    const m=inspect();
    return {version:VERSION,readOnly:true,legacyDataPreserved:true,items:m.items};
  }
  window.inspectPhase47Migration=inspect;
  window.checkPhase47Compatibility=compatibility;
})();
