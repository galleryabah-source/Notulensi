import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { securityRepository, hashToken } from './repositories/security-repository.mjs';
import { closePool } from './db/client.mjs';

if (process.env.ALLOW_INTEGRATION_TESTS !== '1') {
  console.error('Refusing verification: set ALLOW_INTEGRATION_TESTS=1 and use an isolated PostgreSQL database.');
  process.exitCode = 2;
} else {
  const suffix = crypto.randomUUID();
  const ownerId = `verify-owner-${suffix}`;
  const recipientId = `verify-recipient-${suffix}`;
  const ownerSessionId = `verify-owner-session-${suffix}`;
  const recipientSessionId = `verify-recipient-session-${suffix}`;
  const resourceId = `verify-resource-${suffix}`;
  const shareId = `verify-share-${suffix}`;
  const ownerToken = `owner-token-${suffix}`;
  const recipientToken = `recipient-token-${suffix}`;
  const requestId = `verify-request-${suffix}`;
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  const cleanup = async () => {
    // Keep security history (audit/revocation/token events) intact; remove only test subjects.
    const { withDatabaseConnection } = await import('./db/client.mjs');
    await withDatabaseConnection(async (client) => {
      await client.query('BEGIN');
      try {
        await client.query('DELETE FROM share_recipients WHERE share_id=$1', [shareId]);
        await client.query('DELETE FROM share_records WHERE share_id=$1', [shareId]);
        await client.query('DELETE FROM auth_sessions WHERE session_id IN ($1,$2)', [ownerSessionId, recipientSessionId]);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    });
  };

  try {
    const ownerSession = await securityRepository.createSession({
      sessionId: ownerSessionId,
      userId: ownerId,
      token: ownerToken,
      expiresAt,
    });
    await securityRepository.createSession({
      sessionId: recipientSessionId,
      userId: recipientId,
      token: recipientToken,
      expiresAt,
    });

    // Transaction safety: a failed duplicate insert must not damage the existing session.
    await assert.rejects(
      securityRepository.createSession({
        sessionId: ownerSessionId,
        userId: ownerId,
        token: `duplicate-${suffix}`,
        expiresAt,
      })
    );
    assert.equal((await securityRepository.getSessionById(ownerSessionId)).status, 'ACTIVE');
    assert.equal((await securityRepository.getActiveSessionByTokenHash(hashToken(ownerToken))).sessionId, ownerSessionId);

    await securityRepository.createShare({
      shareId,
      resourceType: 'MEETING',
      resourceId,
      ownerUserId: ownerId,
      permission: 'EDIT',
      createdBy: ownerId,
    });
    await securityRepository.addShareRecipient({
      shareId,
      recipientType: 'USER',
      recipientKey: recipientId,
      permission: 'VIEW',
    });

    const matrix = [
      ['VIEW', true],
      ['COMMENT', false],
      ['DOWNLOAD', false],
      ['EDIT', false],
      ['MANAGE', false],
    ];
    for (const [requiredPermission, expected] of matrix) {
      const result = await securityRepository.authorizeResourceAccess({
        sessionId: recipientSessionId,
        actorUserId: recipientId,
        resourceType: 'MEETING',
        resourceId,
        requiredPermission,
        operation: `VERIFY_${requiredPermission}`,
        requestId: `${requestId}-${requiredPermission}`,
      });
      assert.equal(result.allowed, expected, `permission ${requiredPermission}`);
    }

    // Owner permission must be independent from recipient permission.
    const ownerManage = await securityRepository.authorizeResourceAccess({
      sessionId: ownerSessionId,
      actorUserId: ownerId,
      resourceType: 'MEETING',
      resourceId,
      requiredPermission: 'MANAGE',
      operation: 'VERIFY_OWNER_MANAGE',
      requestId: `${requestId}-OWNER`,
    });
    assert.equal(ownerManage.allowed, true);
    assert.equal(ownerManage.grantedPermission, 'MANAGE');

    // Parent share permission caps recipient permission even if a higher recipient permission is attempted.
    const highRecipient = await securityRepository.addShareRecipient({
      shareId,
      recipientType: 'USER',
      recipientKey: `high-${recipientId}`,
      permission: 'MANAGE',
    });
    assert.equal(highRecipient.permission, 'MANAGE');
    await securityRepository.createSession({
      sessionId: `high-session-${suffix}`,
      userId: `high-${recipientId}`,
      token: `high-token-${suffix}`,
      expiresAt,
    });
    const capped = await securityRepository.authorizeResourceAccess({
      sessionId: `high-session-${suffix}`,
      actorUserId: `high-${recipientId}`,
      resourceType: 'MEETING',
      resourceId,
      requiredPermission: 'MANAGE',
      operation: 'VERIFY_PARENT_CAP',
      requestId: `${requestId}-CAP`,
    });
    assert.equal(capped.allowed, false);
    assert.equal(capped.reasonCode, 'PERMISSION_DENIED');

    // Revoke share: recipient access must immediately disappear while audit remains queryable.
    await securityRepository.revokeShare(shareId, 'verification revoke', ownerId, `${requestId}-REVOKE`);
    const deniedAfterShareRevoke = await securityRepository.authorizeResourceAccess({
      sessionId: recipientSessionId,
      actorUserId: recipientId,
      resourceType: 'MEETING',
      resourceId,
      requiredPermission: 'VIEW',
      operation: 'VERIFY_AFTER_SHARE_REVOKE',
      requestId: `${requestId}-AFTER_REVOKE`,
    });
    assert.equal(deniedAfterShareRevoke.allowed, false);

    console.log('Phase 4.25 verification: PASS');
  } catch (error) {
    console.error('Phase 4.25 verification: FAIL');
    console.error(error);
    process.exitCode = 1;
  } finally {
    try { await cleanup(); } finally { await closePool(); }
  }
}
