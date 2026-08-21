/* PHASE 4.17 — deterministic reference persistence adapter */
(function (global) {
  'use strict';

  const ALLOWED = Object.freeze({
    status: ['ACTIVE', 'REVOKED', 'EXPIRED'],
    permission: ['VIEW', 'COMMENT', 'DOWNLOAD', 'EDIT', 'MANAGE'],
    recipientType: ['USER', 'EMAIL', 'LINK', 'ORGANIZATION'],
    auditDecision: ['ALLOW', 'DENY'],
    eventType: ['ISSUED', 'ROTATED', 'REVOKED', 'EXPIRED', 'REJECTED'],
    subjectType: ['SESSION', 'SHARE', 'RECIPIENT'],
  });

  const SECRET_KEYS = ['token', 'rawToken', 'bearerToken', 'password', 'apiKey', 'authorization'];
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const ok = (v, list) => list.includes(v);
  const id = (v, name) => { if (typeof v !== 'string' || !v.trim()) throw new Error(name + ' is required'); };
  const rejectSecrets = (v) => { if (v && typeof v === 'object' && SECRET_KEYS.some((k) => Object.prototype.hasOwnProperty.call(v, k))) throw new Error('secret persistence is forbidden'); };

  class Collection {
    constructor(name) { this.name = name; this.rows = new Map(); }
    insert(key, value) { id(key, this.name + ' key'); if (this.rows.has(key)) throw new Error(this.name + ' already exists'); rejectSecrets(value); this.rows.set(key, clone(value)); return clone(value); }
    get(key) { return this.rows.has(key) ? clone(this.rows.get(key)) : null; }
    set(key, value) { if (!this.rows.has(key)) throw new Error(this.name + ' not found'); rejectSecrets(value); this.rows.set(key, clone(value)); return clone(value); }
    values() { return Array.from(this.rows.values()).map(clone); }
  }

  class PersistenceV417 {
    constructor() {
      this.sessions = new Collection('session');
      this.shares = new Collection('share');
      this.recipients = new Collection('recipient');
      this.tokenEvents = [];
      this.revocations = [];
      this.audit = [];
    }

    createSession(input) {
      const v = input || {};
      id(v.sessionId, 'sessionId'); id(v.tokenHash, 'tokenHash'); rejectSecrets(v);
      if (v.status && !ok(v.status, ALLOWED.status)) throw new Error('invalid session status');
      return this.sessions.insert(v.sessionId, Object.assign({ status: 'ACTIVE' }, v));
    }

    getSession(sessionId) { return this.sessions.get(sessionId); }

    revokeSession(sessionId, meta) {
      const current = this.sessions.get(sessionId); if (!current) throw new Error('session not found');
      if (current.status !== 'ACTIVE') return current;
      const next = Object.assign({}, current, { status: 'REVOKED', revokedAt: (meta && meta.revokedAt) || new Date().toISOString() });
      this.sessions.set(sessionId, next); this.addRevocation({ subjectType: 'SESSION', subjectId: sessionId, reason: (meta && meta.reason) || 'REVOKED', revokedAt: next.revokedAt, revokedBy: meta && meta.revokedBy, requestId: meta && meta.requestId });
      return next;
    }

    createShare(input) {
      const v = input || {}; id(v.shareId, 'shareId'); id(v.resourceType, 'resourceType'); id(v.resourceId, 'resourceId');
      if (!ok(v.permission, ALLOWED.permission)) throw new Error('invalid permission');
      if (v.status && !ok(v.status, ALLOWED.status)) throw new Error('invalid share status');
      return this.shares.insert(v.shareId, Object.assign({ status: 'ACTIVE' }, v));
    }

    getShare(shareId) { return this.shares.get(shareId); }

    revokeShare(shareId, meta) {
      const current = this.shares.get(shareId); if (!current) throw new Error('share not found');
      if (current.status !== 'ACTIVE') return current;
      const next = Object.assign({}, current, { status: 'REVOKED', revokedAt: (meta && meta.revokedAt) || new Date().toISOString() });
      this.shares.set(shareId, next); this.addRevocation({ subjectType: 'SHARE', subjectId: shareId, reason: (meta && meta.reason) || 'REVOKED', revokedAt: next.revokedAt, revokedBy: meta && meta.revokedBy, requestId: meta && meta.requestId });
      return next;
    }

    createRecipient(input) {
      const v = input || {}; id(v.id, 'recipient id'); id(v.shareId, 'shareId'); id(v.recipientKey, 'recipientKey');
      if (!ok(v.recipientType, ALLOWED.recipientType)) throw new Error('invalid recipient type');
      if (!ok(v.permission, ALLOWED.permission)) throw new Error('invalid recipient permission');
      rejectSecrets(v); return this.recipients.insert(v.id, v);
    }

    addTokenEvent(input) {
      const v = input || {}; id(v.eventType, 'eventType'); if (!ok(v.eventType, ALLOWED.eventType)) throw new Error('invalid token event'); rejectSecrets(v);
      const row = clone(Object.assign({ createdAt: new Date().toISOString() }, v)); this.tokenEvents.push(row); return clone(row);
    }

    addRevocation(input) {
      const v = input || {}; if (!ok(v.subjectType, ALLOWED.subjectType)) throw new Error('invalid revocation subject'); id(v.subjectId, 'subjectId'); rejectSecrets(v);
      const row = clone(Object.assign({ revokedAt: new Date().toISOString() }, v)); this.revocations.push(row); return clone(row);
    }

    addAuthorizationAudit(input) {
      const v = input || {}; if (!ok(v.decision, ALLOWED.auditDecision)) throw new Error('invalid audit decision'); id(v.requestId, 'requestId'); rejectSecrets(v);
      const row = clone(Object.assign({ createdAt: new Date().toISOString() }, v)); this.audit.push(Object.freeze(row)); return clone(row);
    }

    snapshot() { return { sessions: this.sessions.values(), shares: this.shares.values(), recipients: this.recipients.values(), tokenEvents: clone(this.tokenEvents), revocations: clone(this.revocations), audit: clone(this.audit) }; }
  }

  function runPhase417SelfTest() {
    const db = new PersistenceV417();
    const s = db.createSession({ sessionId: 's1', userId: 'u1', tokenHash: 'h1' });
    const sh = db.createShare({ shareId: 'sh1', resourceType: 'DOCUMENT', resourceId: 'd1', permission: 'VIEW' });
    db.createRecipient({ id: 'r1', shareId: 'sh1', recipientType: 'USER', recipientKey: 'u1', permission: 'VIEW' });
    db.addTokenEvent({ sessionId: s.sessionId, eventType: 'ISSUED' });
    db.addAuthorizationAudit({ requestId: 'req1', decision: 'ALLOW', operation: 'VIEW', resourceId: 'd1' });
    const revoked = db.revokeShare(sh.shareId, { reason: 'TEST' });
    let rawRejected = false; try { db.createSession({ sessionId: 's2', tokenHash: 'h2', token: 'raw' }); } catch (e) { rawRejected = /forbidden/i.test(e.message); }
    const secondRevoke = db.revokeShare(sh.shareId, { reason: 'SECOND' });
    const checks = { sessionCreated: !!s, shareCreated: !!sh, recipientStored: db.snapshot().recipients.length === 1, auditAppendOnly: db.snapshot().audit.length === 1, revokeMonotonic: revoked.status === 'REVOKED' && secondRevoke.status === 'REVOKED', rawSecretRejected: rawRejected };
    const failed = Object.keys(checks).filter((k) => !checks[k]);
    return { phase: '4.17', passed: failed.length === 0, checks, failed };
  }

  global.createPersistenceV417 = () => new PersistenceV417();
  global.runPhase417SelfTest = runPhase417SelfTest;
})(typeof window !== 'undefined' ? window : globalThis);
