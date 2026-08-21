/* PHASE 4.18 — server authorization integration */
(function (global) {
  'use strict';
  const PERMISSIONS = ['VIEW', 'COMMENT', 'DOWNLOAD', 'EDIT', 'MANAGE'];
  const RANK = { VIEW: 0, COMMENT: 1, DOWNLOAD: 2, EDIT: 3, MANAGE: 4 };
  const expired = (v, now) => !!v && Number.isFinite(Date.parse(v)) && Date.parse(v) <= now.getTime();

  function authorize(ctx) {
    const now = ctx.now instanceof Date ? ctx.now : new Date(ctx.now || Date.now());
    if (!ctx.authenticated) return { decision: 'DENY', reasonCode: 'UNAUTHENTICATED' };
    if (!ctx.session) return { decision: 'DENY', reasonCode: 'SESSION_REVOKED' };
    if (ctx.session.status === 'REVOKED') return { decision: 'DENY', reasonCode: 'SESSION_REVOKED' };
    if (ctx.session.status === 'EXPIRED' || expired(ctx.session.expiresAt, now)) return { decision: 'DENY', reasonCode: 'SESSION_EXPIRED' };
    if (!ctx.share) return { decision: 'DENY', reasonCode: 'SHARE_NOT_FOUND' };
    if (ctx.share.status === 'REVOKED') return { decision: 'DENY', reasonCode: 'SHARE_REVOKED' };
    if (ctx.share.status === 'EXPIRED' || expired(ctx.share.expiresAt, now)) return { decision: 'DENY', reasonCode: 'SHARE_EXPIRED' };
    if (ctx.recipient && ctx.recipient.permission && !PERMISSIONS.includes(ctx.recipient.permission)) return { decision: 'DENY', reasonCode: 'PERMISSION_DENIED' };
    if (!PERMISSIONS.includes(ctx.requestedPermission)) return { decision: 'DENY', reasonCode: 'PERMISSION_DENIED' };
    if (!PERMISSIONS.includes(ctx.share.permission) || RANK[ctx.requestedPermission] > RANK[ctx.share.permission]) return { decision: 'DENY', reasonCode: 'PERMISSION_DENIED' };
    if (ctx.recipient && ctx.recipient.permission && RANK[ctx.requestedPermission] > RANK[ctx.recipient.permission]) return { decision: 'DENY', reasonCode: 'PERMISSION_DENIED' };
    return { decision: 'ALLOW', reasonCode: null };
  }

  function createAuthorizationService(deps) {
    const d = deps || {};
    if (!d.sessionRepository || !d.shareRepository || !d.auditRepository) throw new Error('authorization repositories are required');
    return {
      authorizeAndRun(input) {
        const v = input || {};
        const session = v.sessionId ? d.sessionRepository.getSession(v.sessionId) : null;
        const share = v.shareId ? d.shareRepository.getShare(v.shareId) : null;
        const recipient = v.recipientResolver ? v.recipientResolver({ share, actor: v.actor }) : null;
        const result = authorize(Object.assign({}, v, { session, share, recipient }));
        d.auditRepository.addAuthorizationAudit({ requestId: v.requestId || 'req-' + Date.now(), actorUserId: v.actor && v.actor.userId, sessionId: session && session.sessionId, operation: v.operation, resourceType: share && share.resourceType, resourceId: share && share.resourceId, decision: result.decision, reasonCode: result.reasonCode });
        if (result.decision !== 'ALLOW') return result;
        if (typeof v.handler !== 'function') throw new Error('protected handler is required');
        return { decision: 'ALLOW', result: v.handler({ actor: v.actor, session, share, recipient }) };
      },
    };
  }

  function runPhase418SelfTest() {
    const audit = []; const sessions = { getSession: () => ({ sessionId: 's1', status: 'ACTIVE' }) }; const shares = { getShare: () => ({ shareId: 'sh1', resourceType: 'DOCUMENT', resourceId: 'd1', permission: 'VIEW', status: 'ACTIVE' }) }; const auditRepo = { addAuthorizationAudit: (x) => audit.push(x) };
    const service = createAuthorizationService({ sessionRepository: sessions, shareRepository: shares, auditRepository: auditRepo });
    let ran = false; const allowed = service.authorizeAndRun({ authenticated: true, sessionId: 's1', shareId: 'sh1', requestedPermission: 'VIEW', requestId: 'r1', handler: () => { ran = true; return 'ok'; } });
    let deniedRan = false; const denied = service.authorizeAndRun({ authenticated: false, sessionId: 's1', shareId: 'sh1', requestedPermission: 'VIEW', requestId: 'r2', handler: () => { deniedRan = true; return 'bad'; } });
    const checks = { allow: allowed.decision === 'ALLOW' && ran, deny: denied.decision === 'DENY' && !deniedRan, auditForBoth: audit.length === 2, failClosedHandler: !deniedRan };
    const failed = Object.keys(checks).filter((k) => !checks[k]); return { phase: '4.18', passed: failed.length === 0, checks, failed };
  }
  global.createAuthorizationServiceV418 = createAuthorizationService;
  global.runPhase418SelfTest = runPhase418SelfTest;
})(typeof window !== 'undefined' ? window : globalThis);
