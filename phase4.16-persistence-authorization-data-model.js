/*
 * PHASE 4.16 — Persistence & Authorization Data Model
 * Contract-only module.
 * No database driver, secret storage, or existing domain mutation is introduced.
 */

(function phase416PersistenceAuthorizationModel(global) {
  'use strict';

  const STATUS = Object.freeze({
    ACTIVE: 'ACTIVE',
    REVOKED: 'REVOKED',
    EXPIRED: 'EXPIRED',
  });

  const PERMISSIONS = Object.freeze([
    'VIEW',
    'COMMENT',
    'DOWNLOAD',
    'EDIT',
    'MANAGE',
  ]);

  const RECIPIENT_TYPES = Object.freeze([
    'USER',
    'EMAIL',
    'LINK',
    'ORGANIZATION',
  ]);

  const AUDIT_DECISIONS = Object.freeze(['ALLOW', 'DENY']);

  const REASON_CODES = Object.freeze([
    'UNAUTHENTICATED',
    'SESSION_EXPIRED',
    'SESSION_REVOKED',
    'RESOURCE_NOT_FOUND',
    'SHARE_NOT_FOUND',
    'SHARE_REVOKED',
    'SHARE_EXPIRED',
    'RECIPIENT_MISMATCH',
    'PERMISSION_DENIED',
    'INVALID_REQUEST',
    'RATE_LIMITED',
  ]);

  const EVENT_TYPES = Object.freeze([
    'ISSUED',
    'ROTATED',
    'REVOKED',
    'EXPIRED',
    'REJECTED',
  ]);

  const SUBJECT_TYPES = Object.freeze(['SESSION', 'SHARE', 'RECIPIENT']);

  function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
  }

  function isAllowed(value, list) {
    return list.includes(value);
  }

  function hasRawTokenField(record) {
    if (!record || typeof record !== 'object') return false;
    return Object.prototype.hasOwnProperty.call(record, 'token') ||
      Object.prototype.hasOwnProperty.call(record, 'rawToken') ||
      Object.prototype.hasOwnProperty.call(record, 'bearerToken');
  }

  function createShareRecord(input) {
    const value = input || {};
    if (!isNonEmptyString(value.shareId)) {
      throw new Error('shareId is required');
    }
    if (!isNonEmptyString(value.resourceType) || !isNonEmptyString(value.resourceId)) {
      throw new Error('resource identity is required');
    }
    if (!isAllowed(value.permission, PERMISSIONS)) {
      throw new Error('invalid permission');
    }

    return Object.freeze({
      shareId: value.shareId,
      resourceType: value.resourceType,
      resourceId: value.resourceId,
      ownerUserId: value.ownerUserId || null,
      status: STATUS.ACTIVE,
      permission: value.permission,
      createdAt: value.createdAt || new Date().toISOString(),
      expiresAt: value.expiresAt || null,
      revokedAt: null,
      createdBy: value.createdBy || null,
      revokedBy: null,
      metadata: value.metadata || {},
    });
  }

  function createSessionRecord(input) {
    const value = input || {};
    if (!isNonEmptyString(value.sessionId)) {
      throw new Error('sessionId is required');
    }
    if (!isNonEmptyString(value.tokenHash)) {
      throw new Error('tokenHash is required');
    }
    if (hasRawTokenField(value)) {
      throw new Error('raw token persistence is forbidden');
    }

    return Object.freeze({
      sessionId: value.sessionId,
      userId: value.userId || null,
      tokenHash: value.tokenHash,
      status: STATUS.ACTIVE,
      createdAt: value.createdAt || new Date().toISOString(),
      lastSeenAt: value.lastSeenAt || null,
      expiresAt: value.expiresAt || null,
      revokedAt: null,
      rotatedFromSessionId: value.rotatedFromSessionId || null,
      ipHash: value.ipHash || null,
      userAgentHash: value.userAgentHash || null,
    });
  }

  function isExpired(expiresAt, now) {
    if (!expiresAt) return false;
    const expiry = Date.parse(expiresAt);
    const current = now instanceof Date ? now.getTime() : Date.parse(now || new Date().toISOString());
    return Number.isFinite(expiry) && Number.isFinite(current) && expiry <= current;
  }

  function evaluateAuthorization(input) {
    const value = input || {};
    const now = value.now instanceof Date ? value.now : new Date(value.now || Date.now());

    if (!value.authenticated) {
      return { decision: 'DENY', reasonCode: 'UNAUTHENTICATED' };
    }
    if (!value.session || value.session.status === STATUS.REVOKED) {
      return { decision: 'DENY', reasonCode: 'SESSION_REVOKED' };
    }
    if (value.session.status === STATUS.EXPIRED || isExpired(value.session.expiresAt, now)) {
      return { decision: 'DENY', reasonCode: 'SESSION_EXPIRED' };
    }
    if (!value.share) {
      return { decision: 'DENY', reasonCode: 'SHARE_NOT_FOUND' };
    }
    if (value.share.status === STATUS.REVOKED) {
      return { decision: 'DENY', reasonCode: 'SHARE_REVOKED' };
    }
    if (value.share.status === STATUS.EXPIRED || isExpired(value.share.expiresAt, now)) {
      return { decision: 'DENY', reasonCode: 'SHARE_EXPIRED' };
    }
    if (value.recipientType && !isAllowed(value.recipientType, RECIPIENT_TYPES)) {
      return { decision: 'DENY', reasonCode: 'RECIPIENT_MISMATCH' };
    }
    if (!isAllowed(value.requestedPermission, PERMISSIONS)) {
      return { decision: 'DENY', reasonCode: 'PERMISSION_DENIED' };
    }
    if (PERMISSIONS.indexOf(value.requestedPermission) > PERMISSIONS.indexOf(value.share.permission)) {
      return { decision: 'DENY', reasonCode: 'PERMISSION_DENIED' };
    }

    return { decision: 'ALLOW', reasonCode: null };
  }

  function runPhase416SelfTest() {
    const fixedNow = new Date('2026-08-21T12:00:00.000Z');
    const activeShare = createShareRecord({
      shareId: 'shr_test_001',
      resourceType: 'DOCUMENT',
      resourceId: 'doc_test_001',
      permission: 'VIEW',
      expiresAt: '2026-08-21T13:00:00.000Z',
    });
    const activeSession = createSessionRecord({
      sessionId: 'ses_test_001',
      userId: 'user_test_001',
      tokenHash: 'sha256:test-token-hash',
      expiresAt: '2026-08-21T13:00:00.000Z',
    });

    const allow = evaluateAuthorization({
      authenticated: true,
      session: activeSession,
      share: activeShare,
      recipientType: 'USER',
      requestedPermission: 'VIEW',
      now: fixedNow,
    });

    const expired = evaluateAuthorization({
      authenticated: true,
      session: activeSession,
      share: activeShare,
      recipientType: 'USER',
      requestedPermission: 'VIEW',
      now: new Date('2026-08-21T14:00:00.000Z'),
    });

    const unauthenticated = evaluateAuthorization({
      authenticated: false,
      session: activeSession,
      share: activeShare,
      requestedPermission: 'VIEW',
      now: fixedNow,
    });

    let rawTokenRejected = false;
    try {
      createSessionRecord({
        sessionId: 'ses_test_002',
        userId: 'user_test_001',
        tokenHash: 'sha256:test',
        token: 'DO_NOT_PERSIST',
      });
    } catch (error) {
      rawTokenRejected = error instanceof Error && /forbidden/i.test(error.message);
    }

    const checks = {
      shareSchema: activeShare.status === STATUS.ACTIVE && activeShare.permission === 'VIEW',
      sessionSchema: activeSession.status === STATUS.ACTIVE && Boolean(activeSession.tokenHash),
      allowActive: allow.decision === 'ALLOW',
      denyExpired: expired.decision === 'DENY' && expired.reasonCode === 'SESSION_EXPIRED',
      denyUnauthenticated: unauthenticated.decision === 'DENY' && unauthenticated.reasonCode === 'UNAUTHENTICATED',
      rawTokenRejected,
      enumsStable: PERMISSIONS.length === 5 && RECIPIENT_TYPES.length === 4,
    };

    const failed = Object.keys(checks).filter((key) => !checks[key]);
    return {
      phase: '4.16',
      passed: failed.length === 0,
      checks,
      failed,
      evaluatedAt: new Date().toISOString(),
    };
  }

  global.createPersistenceAuthorizationV416 = function createPersistenceAuthorizationV416() {
    return Object.freeze({
      STATUS,
      PERMISSIONS,
      RECIPIENT_TYPES,
      AUDIT_DECISIONS,
      REASON_CODES,
      EVENT_TYPES,
      SUBJECT_TYPES,
      createShareRecord,
      createSessionRecord,
      evaluateAuthorization,
      runSelfTest: runPhase416SelfTest,
    });
  };

  global.runPhase416SelfTest = runPhase416SelfTest;
})(typeof window !== 'undefined' ? window : globalThis);
