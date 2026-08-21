import crypto from 'node:crypto';
import { withDatabaseConnection } from '../db/client.mjs';

const PERMISSION_RANK = Object.freeze({ VIEW: 1, COMMENT: 2, DOWNLOAD: 3, EDIT: 4, MANAGE: 5 });

function assertPermission(permission) {
  if (!(permission in PERMISSION_RANK)) throw new Error(`Invalid permission: ${permission}`);
}

function hashToken(token) {
  if (typeof token !== 'string' || token.length === 0) throw new Error('token must be a non-empty string');
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}

function normalizeSession(row) {
  if (!row) return null;
  return {
    id: row.id,
    sessionId: row.session_id,
    userId: row.user_id,
    tokenHash: row.token_hash,
    status: row.status,
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    rotatedFromSessionId: row.rotated_from_session_id
  };
}

function normalizeShare(row) {
  if (!row) return null;
  return {
    id: row.id,
    shareId: row.share_id,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    ownerUserId: row.owner_user_id,
    status: row.status,
    permission: row.permission,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    createdBy: row.created_by,
    revokedBy: row.revoked_by,
    metadata: row.metadata_json
  };
}

function normalizeRecipient(row) {
  if (!row) return null;
  return {
    id: row.id,
    shareId: row.share_id,
    recipientType: row.recipient_type,
    recipientKey: row.recipient_key,
    permission: row.permission,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    metadata: row.metadata_json
  };
}

export const securityRepository = Object.freeze({
  async createSession(input) {
    const { sessionId, userId, token, expiresAt, ipHash = null, userAgentHash = null, rotatedFromSessionId = null } = input;
    const tokenHash = hashToken(token);
    return withDatabaseConnection(async (client) => {
      await client.query('BEGIN');
      try {
        const result = await client.query(
          `INSERT INTO auth_sessions
             (session_id, user_id, token_hash, expires_at, ip_hash, user_agent_hash, rotated_from_session_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7)
           RETURNING *`,
          [sessionId, userId, tokenHash, expiresAt, ipHash, userAgentHash, rotatedFromSessionId]
        );
        await client.query(
          `INSERT INTO token_events (session_id, event_type) VALUES ($1, 'ISSUED')`,
          [sessionId]
        );
        await client.query('COMMIT');
        return normalizeSession(result.rows[0]);
      } catch (error) { await client.query('ROLLBACK'); throw error; }
    });
  },

  async getSessionById(sessionId) {
    return withDatabaseConnection(async (client) => {
      const { rows } = await client.query('SELECT * FROM auth_sessions WHERE session_id = $1', [sessionId]);
      return normalizeSession(rows[0]);
    });
  },

  async getActiveSessionByTokenHash(tokenHash) {
    if (typeof tokenHash !== 'string' || !/^[a-f0-9]{64}$/i.test(tokenHash)) throw new Error('tokenHash must be a SHA-256 hex digest');
    return withDatabaseConnection(async (client) => {
      const { rows } = await client.query(
        `SELECT * FROM auth_sessions
         WHERE token_hash = $1 AND status = 'ACTIVE' AND expires_at > now()`,
        [tokenHash.toLowerCase()]
      );
      return normalizeSession(rows[0]);
    });
  },

  async rotateSession(sessionId, input) {
    const { newSessionId, newToken, expiresAt, ipHash = null, userAgentHash = null } = input;
    const newTokenHash = hashToken(newToken);
    return withDatabaseConnection(async (client) => {
      await client.query('BEGIN');
      try {
        const current = await client.query('SELECT * FROM auth_sessions WHERE session_id = $1 FOR UPDATE', [sessionId]);
        if (!current.rowCount) throw new Error('Session not found');
        const row = current.rows[0];
        if (row.status !== 'ACTIVE' || new Date(row.expires_at) <= new Date()) throw new Error('Session is not active');
        await client.query(`UPDATE auth_sessions SET status='REVOKED', revoked_at=now() WHERE session_id=$1`, [sessionId]);
        await client.query(`INSERT INTO token_events (session_id,event_type) VALUES ($1,'ROTATED'),($2,'REVOKED')`, [newSessionId, sessionId]);
        const created = await client.query(
          `INSERT INTO auth_sessions (session_id,user_id,token_hash,expires_at,ip_hash,user_agent_hash,rotated_from_session_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
          [newSessionId, row.user_id, newTokenHash, expiresAt, ipHash, userAgentHash, sessionId]
        );
        await client.query('COMMIT');
        return normalizeSession(created.rows[0]);
      } catch (error) { await client.query('ROLLBACK'); throw error; }
    });
  },

  async revokeSession(sessionId, reason, actorUserId = null, requestId = null) {
    return withDatabaseConnection(async (client) => {
      await client.query('BEGIN');
      try {
        const result = await client.query(`UPDATE auth_sessions SET status='REVOKED', revoked_at=COALESCE(revoked_at,now()) WHERE session_id=$1 AND status <> 'REVOKED' RETURNING *`, [sessionId]);
        if (result.rowCount) {
          await client.query(`INSERT INTO token_events (session_id,event_type,request_id,metadata_json) VALUES ($1,'REVOKED',$2,$3)`, [sessionId, requestId, JSON.stringify({ reason })]);
          await client.query(`INSERT INTO revocation_records (subject_type,subject_id,reason,revoked_by,request_id) VALUES ('SESSION',$1,$2,$3,$4)`, [sessionId, reason, actorUserId, requestId]);
        }
        await client.query('COMMIT');
        return normalizeSession(result.rows[0]) || null;
      } catch (error) { await client.query('ROLLBACK'); throw error; }
    });
  },

  async expireSessions() {
    return withDatabaseConnection(async (client) => {
      await client.query('BEGIN');
      try {
        const result = await client.query(`UPDATE auth_sessions SET status='EXPIRED' WHERE status='ACTIVE' AND expires_at <= now() RETURNING session_id`);
        for (const row of result.rows) await client.query(`INSERT INTO token_events (session_id,event_type) VALUES ($1,'EXPIRED')`, [row.session_id]);
        await client.query('COMMIT');
        return result.rowCount;
      } catch (error) { await client.query('ROLLBACK'); throw error; }
    });
  },

  async createShare(input) {
    assertPermission(input.permission);
    return withDatabaseConnection(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO share_records
          (share_id,resource_type,resource_id,owner_user_id,permission,expires_at,created_by,metadata_json)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [input.shareId, input.resourceType, input.resourceId, input.ownerUserId, input.permission, input.expiresAt ?? null, input.createdBy, JSON.stringify(input.metadata ?? {})]
      );
      return normalizeShare(rows[0]);
    });
  },

  async getShareById(shareId) {
    return withDatabaseConnection(async (client) => {
      const { rows } = await client.query('SELECT * FROM share_records WHERE share_id=$1', [shareId]);
      return normalizeShare(rows[0]);
    });
  },

  async listSharesForResource(resourceType, resourceId) {
    return withDatabaseConnection(async (client) => {
      const { rows } = await client.query('SELECT * FROM share_records WHERE resource_type=$1 AND resource_id=$2 ORDER BY created_at DESC', [resourceType, resourceId]);
      return rows.map(normalizeShare);
    });
  },

  async revokeShare(shareId, reason, actorUserId = null, requestId = null) {
    return withDatabaseConnection(async (client) => {
      await client.query('BEGIN');
      try {
        const result = await client.query(`UPDATE share_records SET status='REVOKED', revoked_at=COALESCE(revoked_at,now()), revoked_by=$2 WHERE share_id=$1 AND status <> 'REVOKED' RETURNING *`, [shareId, actorUserId]);
        if (result.rowCount) await client.query(`INSERT INTO revocation_records (subject_type,subject_id,reason,revoked_by,request_id) VALUES ('SHARE',$1,$2,$3,$4)`, [shareId, reason, actorUserId, requestId]);
        await client.query('COMMIT');
        return normalizeShare(result.rows[0]) || null;
      } catch (error) { await client.query('ROLLBACK'); throw error; }
    });
  },

  async addShareRecipient(input) {
    assertPermission(input.permission);
    return withDatabaseConnection(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO share_recipients (share_id,recipient_type,recipient_key,permission,expires_at,metadata_json)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [input.shareId, input.recipientType, input.recipientKey, input.permission, input.expiresAt ?? null, JSON.stringify(input.metadata ?? {})]
      );
      return normalizeRecipient(rows[0]);
    });
  },

  async listShareRecipients(shareId) {
    return withDatabaseConnection(async (client) => {
      const { rows } = await client.query('SELECT * FROM share_recipients WHERE share_id=$1 ORDER BY created_at', [shareId]);
      return rows.map(normalizeRecipient);
    });
  },

  async revokeShareRecipient(recipientId, reason, actorUserId = null, requestId = null) {
    return withDatabaseConnection(async (client) => {
      await client.query('BEGIN');
      try {
        const result = await client.query(`UPDATE share_recipients SET revoked_at=COALESCE(revoked_at,now()) WHERE id=$1 AND revoked_at IS NULL RETURNING *`, [recipientId]);
        if (result.rowCount) await client.query(`INSERT INTO revocation_records (subject_type,subject_id,reason,revoked_by,request_id) VALUES ('RECIPIENT',$1,$2,$3,$4)`, [recipientId, reason, actorUserId, requestId]);
        await client.query('COMMIT');
        return normalizeRecipient(result.rows[0]) || null;
      } catch (error) { await client.query('ROLLBACK'); throw error; }
    });
  },

  async appendTokenEvent(input) {
    const { rows } = await withDatabaseConnection(client => client.query(`INSERT INTO token_events (session_id,event_type,request_id,metadata_json) VALUES ($1,$2,$3,$4) RETURNING *`, [input.sessionId, input.eventType, input.requestId ?? null, JSON.stringify(input.metadata ?? {})]));
    return rows[0];
  },

  async appendRevocation(input) {
    const { rows } = await withDatabaseConnection(client => client.query(`INSERT INTO revocation_records (subject_type,subject_id,reason,revoked_by,request_id) VALUES ($1,$2,$3,$4,$5) RETURNING *`, [input.subjectType, input.subjectId, input.reason, input.revokedBy ?? null, input.requestId ?? null]));
    return rows[0];
  },

  async appendAuthorizationAudit(input) {
    const { rows } = await withDatabaseConnection(client => client.query(`INSERT INTO authorization_audit (request_id,actor_user_id,session_id,operation,resource_type,resource_id,decision,reason_code,metadata_json) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`, [input.requestId, input.actorUserId ?? null, input.sessionId ?? null, input.operation, input.resourceType ?? null, input.resourceId ?? null, input.decision, input.reasonCode ?? null, JSON.stringify(input.metadata ?? {})]));
    return rows[0];
  },

  async authorizeResourceAccess(input) {
    assertPermission(input.requiredPermission);
    return withDatabaseConnection(async (client) => {
      const sessionResult = await client.query(
        `SELECT * FROM auth_sessions WHERE session_id=$1 AND user_id=$2 AND status='ACTIVE' AND expires_at > now()`,
        [input.sessionId, input.actorUserId]
      );
      let decision = 'DENY';
      let reasonCode = 'SESSION_INVALID';
      let grantedPermission = null;
      if (sessionResult.rowCount) {
        const shareResult = await client.query(
          `SELECT s.*, r.recipient_type, r.recipient_key, r.permission AS recipient_permission
           FROM share_records s
           LEFT JOIN share_recipients r ON r.share_id=s.share_id
             AND r.revoked_at IS NULL AND (r.expires_at IS NULL OR r.expires_at > now())
           WHERE s.resource_type=$1 AND s.resource_id=$2
             AND s.status='ACTIVE' AND (s.expires_at IS NULL OR s.expires_at > now())
             AND (s.owner_user_id=$3 OR (r.recipient_type='USER' AND r.recipient_key=$3) OR (r.recipient_type='LINK' AND r.recipient_key=$4))`,
          [input.resourceType, input.resourceId, input.actorUserId, input.linkKey ?? null]
        );
        for (const row of shareResult.rows) {
          const candidate = row.owner_user_id === input.actorUserId ? 'MANAGE' : row.recipient_permission;
          if (candidate && PERMISSION_RANK[candidate] >= PERMISSION_RANK[input.requiredPermission]) {
            decision = 'ALLOW';
            reasonCode = 'PERMISSION_GRANTED';
            grantedPermission = candidate;
            break;
          }
        }
        if (decision === 'DENY') reasonCode = 'PERMISSION_DENIED';
      }
      if (input.requestId) {
        await client.query(`INSERT INTO authorization_audit (request_id,actor_user_id,session_id,operation,resource_type,resource_id,decision,reason_code,metadata_json) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [input.requestId, input.actorUserId, input.sessionId, input.operation, input.resourceType, input.resourceId, decision, reasonCode, JSON.stringify(input.metadata ?? {})]);
      }
      return { decision, allowed: decision === 'ALLOW', reasonCode, grantedPermission };
    });
  }
});

export { hashToken, PERMISSION_RANK };
