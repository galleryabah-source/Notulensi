import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { securityRepository, hashToken } from './repositories/security-repository.mjs';
import { withDatabaseConnection, closePool } from './db/client.mjs';

if (process.env.ALLOW_INTEGRATION_TESTS !== '1') {
  console.error('Refusing integration test: set ALLOW_INTEGRATION_TESTS=1 and use an isolated PostgreSQL database.');
  process.exitCode = 2;
} else {
  const suffix = crypto.randomUUID();
  const userId = `test-user-${suffix}`;
  const otherUserId = `test-other-${suffix}`;
  const sessionId = `test-session-${suffix}`;
  const shareId = `test-share-${suffix}`;
  const resourceId = `test-resource-${suffix}`;
  const requestId = `test-request-${suffix}`;
  const token = `token-${suffix}`;

  try {
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const session = await securityRepository.createSession({ sessionId, userId, token, expiresAt });
    assert.equal(session.userId, userId);
    assert.equal(session.status, 'ACTIVE');
    assert.equal(session.tokenHash, hashToken(token));
    assert.equal((await securityRepository.getActiveSessionByTokenHash(hashToken(token))).sessionId, sessionId);

    const share = await securityRepository.createShare({
      shareId, resourceType: 'MEETING', resourceId, ownerUserId: userId, permission: 'VIEW', createdBy: userId
    });
    assert.equal(share.shareId, shareId);
    const recipient = await securityRepository.addShareRecipient({
      shareId, recipientType: 'USER', recipientKey: otherUserId, permission: 'EDIT'
    });

    const otherSessionId = `test-other-session-${suffix}`;
    const otherToken = `other-token-${suffix}`;
    await securityRepository.createSession({ sessionId: otherSessionId, userId: otherUserId, token: otherToken, expiresAt });

    const allowed = await securityRepository.authorizeResourceAccess({
      sessionId: otherSessionId, actorUserId: otherUserId, resourceType: 'MEETING', resourceId,
      requiredPermission: 'EDIT', operation: 'EDIT_MEETING', requestId
    });
    assert.equal(allowed.allowed, true);
    assert.equal(allowed.grantedPermission, 'EDIT');

    await securityRepository.revokeShareRecipient(recipient.id, 'test revoke', userId, requestId);
    const deniedAfterRecipientRevoke = await securityRepository.authorizeResourceAccess({
      sessionId: otherSessionId, actorUserId: otherUserId, resourceType: 'MEETING', resourceId,
      requiredPermission: 'VIEW', operation: 'VIEW_MEETING', requestId: `deny-${suffix}`
    });
    assert.equal(deniedAfterRecipientRevoke.allowed, false);

    const revoked = await securityRepository.revokeSession(sessionId, 'test revoke', userId, requestId);
    assert.equal(revoked.status, 'REVOKED');
    assert.equal(await securityRepository.getActiveSessionByTokenHash(hashToken(token)), null);

    const expiredSessionId = `expired-session-${suffix}`;
    await securityRepository.createSession({
      sessionId: expiredSessionId, userId, token: `expired-token-${suffix}`, expiresAt: new Date(Date.now() - 1000)
    });
    assert.equal(await securityRepository.expireSessions() >= 1, true);

    const appendOnlyCheck = await withDatabaseConnection(async (client) => {
      const result = await client.query(`SELECT id FROM authorization_audit WHERE request_id=$1`, [requestId]);
      assert.ok(result.rowCount >= 1);
      await assert.rejects(
        client.query(`DELETE FROM authorization_audit WHERE request_id=$1`, [requestId]),
        /authorization_audit is append-only/
      );
      return true;
    });
    assert.equal(appendOnlyCheck, true);

    await withDatabaseConnection(async (client) => {
      await client.query('BEGIN');
      try {
        await client.query('DELETE FROM share_recipients WHERE share_id=$1', [shareId]);
        await client.query('DELETE FROM share_records WHERE share_id=$1', [shareId]);
        await client.query('DELETE FROM token_events WHERE session_id IN ($1,$2,$3)', [sessionId, otherSessionId, expiredSessionId]);
        await client.query('DELETE FROM auth_sessions WHERE session_id IN ($1,$2,$3)', [sessionId, otherSessionId, expiredSessionId]);
        await client.query('DELETE FROM authorization_audit WHERE request_id LIKE $1', [`%${suffix}%`]);
        await client.query('DELETE FROM revocation_records WHERE request_id=$1', [requestId]);
        await client.query('COMMIT');
      } catch (error) { await client.query('ROLLBACK'); throw error; }
    });

    console.log('Phase 4.24 integration tests: PASS');
  } catch (error) {
    console.error('Phase 4.24 integration tests: FAIL');
    console.error(error);
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}
