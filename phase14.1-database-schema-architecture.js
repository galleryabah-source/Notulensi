/* Phase 14.1 — Database Schema Architecture
 * Design-only boundary. No database connection or migration is performed here.
 */
(function (global) {
  'use strict';
  const entities=[
    'users','sessions','documents','document_revisions','document_packs',
    'meetings','transcripts','analysis_runs','knowledge_items',
    'ai_requests','ai_responses','action_proposals','action_executions',
    'audit_events','migration_runs','migration_backups'
  ];
  const invariants={
    ownerScoped:true,
    revisionImmutable:true,
    auditAppendOnly:true,
    idempotencyRequired:true,
    foreignKeysRequired:true,
    timestampsRequired:true,
    softDeletePreferred:true,
    secretsNeverPersistedInDomainTables:true
  };
  function describe(){
    return {phase:'14.1',status:'SCHEMA_ARCHITECTURE_DEFINED',entities,invariants,destructiveMigrationAllowed:false};
  }
  global.phase141DatabaseSchemaArchitecture={entities,invariants,describe};
})(window);
