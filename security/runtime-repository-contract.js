/* PHASE 4.22 — dependency-free runtime repository contract */
(function (global) {
  'use strict';

  const METHODS = Object.freeze([
    'createSession',
    'getSessionById',
    'getActiveSessionByTokenHash',
    'rotateSession',
    'revokeSession',
    'expireSessions',
    'createShare',
    'getShareById',
    'listSharesForResource',
    'revokeShare',
    'addShareRecipient',
    'listShareRecipients',
    'revokeShareRecipient',
    'appendTokenEvent',
    'appendRevocation',
    'appendAuthorizationAudit',
    'authorizeResourceAccess'
  ]);

  const SECURITY_INVARIANTS = Object.freeze([
    'tokenHashOnly',
    'atomicSecurityMutation',
    'revocationWins',
    'expiryDenies',
    'appendOnlyAudit',
    'appendOnlyRevocation',
    'parameterizedSql',
    'serverAuthority'
  ]);

  function createRuntimeRepositoryContract(adapter) {
    const target = adapter || {};
    const missing = METHODS.filter((name) => typeof target[name] !== 'function');

    return Object.freeze({
      valid: missing.length === 0,
      missing,
      methods: METHODS.slice(),
      invariants: SECURITY_INVARIANTS.slice(),
      adapter: target
    });
  }

  function runPhase422ContractSelfTest(adapter) {
    const contract = createRuntimeRepositoryContract(adapter);
    return {
      phase: '4.22',
      passed: contract.valid,
      methodCount: METHODS.length,
      missing: contract.missing,
      invariants: contract.invariants.slice()
    };
  }

  global.PHASE_422_REPOSITORY_METHODS = METHODS;
  global.PHASE_422_SECURITY_INVARIANTS = SECURITY_INVARIANTS;
  global.createRuntimeRepositoryContract = createRuntimeRepositoryContract;
  global.runPhase422ContractSelfTest = runPhase422ContractSelfTest;
})(typeof window !== 'undefined' ? window : globalThis);
