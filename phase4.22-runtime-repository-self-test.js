/* PHASE 4.22 — static contract verification */
(function (global) {
  'use strict';

  const REQUIRED_METHODS = [
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
  ];

  const REQUIRED_INVARIANTS = [
    'tokenHashOnly',
    'atomicSecurityMutation',
    'revocationWins',
    'expiryDenies',
    'appendOnlyAudit',
    'appendOnlyRevocation',
    'parameterizedSql',
    'serverAuthority'
  ];

  function runPhase422StaticSelfTest(contractSource, docsSource) {
    const source = String(contractSource || '');
    const docs = String(docsSource || '');
    const checks = {};

    for (const method of REQUIRED_METHODS) {
      checks['method:' + method] = source.includes("'" + method + "'");
    }

    for (const invariant of REQUIRED_INVARIANTS) {
      checks['invariant:' + invariant] = source.includes("'" + invariant + "'");
    }

    checks.transactionDocumented = /BEGIN[\s\S]*COMMIT[\s\S]*ROLLBACK/i.test(docs);
    checks.noRawBearerTokenContract = /token hashes, never raw bearer tokens/i.test(docs);
    checks.noClientAuthorizationTrust = /localStorage value is trusted as server authorization state/i.test(docs) === false;
    checks.compatibilityBoundary = /existing client behavior/i.test(docs);

    const failed = Object.keys(checks).filter((key) => !checks[key]);
    return { phase: '4.22', passed: failed.length === 0, checks, failed };
  }

  global.runPhase422StaticSelfTest = runPhase422StaticSelfTest;
})(typeof window !== 'undefined' ? window : globalThis);
