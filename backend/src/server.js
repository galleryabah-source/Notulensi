import crypto from 'node:crypto';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import pg from 'pg';
import { z } from 'zod';

const { Pool } = pg;
const app = express();
const port = Number(process.env.PORT || 8080);
const databaseUrl = process.env.DATABASE_URL;
const jwtSecret = process.env.JWT_SECRET;
const tokenPepper = process.env.SHARE_TOKEN_PEPPER;

if (!databaseUrl || !jwtSecret || !tokenPepper) {
  throw new Error('DATABASE_URL, JWT_SECRET, and SHARE_TOKEN_PEPPER are required');
}

const pool = new Pool({
  connectionString: databaseUrl,
  max: Number(process.env.DB_POOL_MAX || 10),
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: true } : undefined
});

app.disable('x-powered-by');
app.set('trust proxy', Number(process.env.TRUST_PROXY || 1));
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim()) : false,
  credentials: true
}));
app.use(express.json({ limit: '256kb' }));

const resolveLimiter = rateLimit({
  windowMs: 60_000,
  limit: Number(process.env.RESOLVE_RATE_LIMIT || 60),
  standardHeaders: 'draft-8',
  legacyHeaders: false
});

const visibility = z.enum(['private', 'unlisted', 'public']);
const policySchema = z.object({
  visibility: visibility.default('unlisted'),
  allowAnonymousRead: z.boolean().default(true),
  allowIndexing: z.boolean().default(false),
  allowDownload: z.boolean().default(true),
  ttlMinutes: z.number().int().min(1).max(60 * 24 * 30).default(1440),
  maxAccessPerMinute: z.number().int().min(1).max(1000).default(30)
}).strict();

function hashSecret(value) {
  return crypto.createHmac('sha256', tokenPepper).update(value).digest('hex');
}

function safeEqualHash(a, b) {
  const left = Buffer.from(a, 'hex');
  const right = Buffer.from(b, 'hex');
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function issueToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function hashClient(value) {
  return crypto.createHmac('sha256', tokenPepper).update(value || '').digest('hex');
}

function auth(req, res, next) {
  const value = req.get('authorization') || '';
  if (!value.startsWith('Bearer ')) return res.status(401).json({ error: 'authentication_required' });
  try {
    const claims = jwt.verify(value.slice(7), jwtSecret);
    if (!claims || typeof claims !== 'object' || !claims.sub) throw new Error('invalid_claims');
    req.user = { id: String(claims.sub), role: claims.role ? String(claims.role) : 'user' };
    next();
  } catch {
    return res.status(401).json({ error: 'invalid_authentication' });
  }
}

function audit(req, client, shareId, event, actorId = null, metadata = {}) {
  return client.query(
    `INSERT INTO share_access_logs (share_id,event,actor_id,ip_hash,user_agent_hash,metadata)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [shareId, event, actorId, hashClient(req.ip), hashClient(req.get('user-agent') || ''), metadata]
  );
}

function expiresAtFromPolicy(policy) {
  return new Date(Date.now() + policy.ttlMinutes * 60_000);
}

function isAdmin(req) {
  return req.user?.role === 'admin';
}

async function authorizePrivateShare(req, share) {
  if (share.visibility !== 'private') return true;
  if (!req.user) return false;
  return isAdmin(req) || String(share.owner_id) === String(req.user.id);
}

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, service: 'secure-share-backend', phase: '4.8' });
  } catch {
    res.status(503).json({ ok: false });
  }
});

app.post('/api/shares', auth, async (req, res, next) => {
  const schema = z.object({
    documentId: z.string().min(1).max(255),
    revisionId: z.string().min(1).max(255),
    visibility,
    policy: policySchema.partial().optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_request', details: parsed.error.flatten() });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const doc = await client.query(
      `SELECT d.id, d.owner_id, r.id AS revision_id
       FROM documents d
       JOIN document_revisions r ON r.document_id=d.id
       WHERE d.id=$1 AND r.id=$2
       FOR SHARE`,
      [parsed.data.documentId, parsed.data.revisionId]
    );
    if (!doc.rowCount || (String(doc.rows[0].owner_id) !== String(req.user.id) && !isAdmin(req))) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'document_access_denied' });
    }

    const policy = policySchema.parse({ ...(parsed.data.policy || {}), visibility: parsed.data.visibility });
    const rawToken = issueToken();
    const tokenHash = hashSecret(rawToken);
    const expiresAt = expiresAtFromPolicy(policy);
    const inserted = await client.query(
      `INSERT INTO document_shares
        (document_id,revision_id,owner_id,token_hash,visibility,expires_at,policy)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id,document_id,revision_id,visibility,expires_at,created_at`,
      [parsed.data.documentId, parsed.data.revisionId, doc.rows[0].owner_id, tokenHash, policy.visibility, expiresAt, policy]
    );
    await audit(req, client, inserted.rows[0].id, 'created', req.user.id, { visibility: policy.visibility });
    await client.query('COMMIT');
    return res.status(201).json({ share: inserted.rows[0], accessToken: rawToken });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    next(error);
  } finally {
    client.release();
  }
});

app.get('/api/shares/:shareId', resolveLimiter, async (req, res, next) => {
  const shareToken = req.get('x-share-token') || req.query.token;
  if (typeof shareToken !== 'string' || shareToken.length < 20) {
    return res.status(401).json({ error: 'share_token_required' });
  }

  try {
    const result = await pool.query(
      `SELECT s.*, d.source_meeting_id, r.revision_number, r.content_hash, r.content,
              r.source_transcript_hash, r.source_analysis_hash
       FROM document_shares s
       JOIN documents d ON d.id=s.document_id
       JOIN document_revisions r ON r.id=s.revision_id
       WHERE s.id=$1`,
      [req.params.shareId]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'share_not_found' });

    const share = result.rows[0];
    const validToken = safeEqualHash(hashSecret(shareToken), share.token_hash);
    const expired = Boolean(share.expires_at && new Date(share.expires_at).getTime() <= Date.now());

    if (!validToken || share.revoked_at || expired) {
      const event = expired ? 'expired' : 'denied';
      await pool.query(
        `INSERT INTO share_access_logs (share_id,event,ip_hash,user_agent_hash,metadata)
         VALUES ($1,$2,$3,$4,$5)`,
        [share.id, event, hashClient(req.ip), hashClient(req.get('user-agent') || ''), {}]
      );
      return res.status(403).json({ error: expired ? 'share_expired' : 'share_access_denied' });
    }

    let authenticatedUser = null;
    const authHeader = req.get('authorization') || '';
    if (authHeader.startsWith('Bearer ')) {
      try {
        const claims = jwt.verify(authHeader.slice(7), jwtSecret);
        if (claims && typeof claims === 'object' && claims.sub) {
          authenticatedUser = { id: String(claims.sub), role: claims.role ? String(claims.role) : 'user' };
        }
      } catch {
        authenticatedUser = null;
      }
    }
    req.user = authenticatedUser;

    if (!share.policy?.allowAnonymousRead && !req.user) {
      await pool.query(
        `INSERT INTO share_access_logs (share_id,event,ip_hash,user_agent_hash,metadata)
         VALUES ($1,'denied',$2,$3,$4)`,
        [share.id, hashClient(req.ip), hashClient(req.get('user-agent') || ''), { reason: 'authentication_required' }]
      );
      return res.status(401).json({ error: 'authentication_required' });
    }

    if (!(await authorizePrivateShare(req, share))) {
      await pool.query(
        `INSERT INTO share_access_logs (share_id,event,ip_hash,user_agent_hash,metadata)
         VALUES ($1,'denied',$2,$3,$4)`,
        [share.id, hashClient(req.ip), hashClient(req.get('user-agent') || ''), { reason: 'private_share' }]
      );
      return res.status(403).json({ error: 'share_access_denied' });
    }

    const policy = policySchema.parse(share.policy || { visibility: share.visibility });
    const recentAccess = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM share_access_logs
       WHERE share_id=$1 AND event='resolved' AND occurred_at >= now() - interval '1 minute'`,
      [share.id]
    );
    if (recentAccess.rows[0].count >= policy.maxAccessPerMinute) {
      await pool.query(
        `INSERT INTO share_access_logs (share_id,event,ip_hash,user_agent_hash,metadata)
         VALUES ($1,'denied',$2,$3,$4)`,
        [share.id, hashClient(req.ip), hashClient(req.get('user-agent') || ''), { reason: 'share_policy_rate_limit' }]
      );
      return res.status(429).json({ error: 'share_rate_limited' });
    }

    await pool.query(
      `INSERT INTO share_access_logs (share_id,event,actor_id,ip_hash,user_agent_hash,metadata)
       VALUES ($1,'resolved',$2,$3,$4,$5)`,
      [share.id, req.user?.id || null, hashClient(req.ip), hashClient(req.get('user-agent') || ''), {}]
    );

    return res.json({
      share: {
        id: share.id,
        documentId: share.document_id,
        revisionId: share.revision_id,
        visibility: share.visibility,
        expiresAt: share.expires_at,
        policy: share.policy
      },
      revision: {
        id: share.revision_id,
        revisionNumber: share.revision_number,
        contentHash: share.content_hash,
        content: share.content,
        sourceMeetingId: share.source_meeting_id,
        sourceTranscriptHash: share.source_transcript_hash,
        sourceAnalysisHash: share.source_analysis_hash
      }
    });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/shares/:shareId', auth, async (req, res, next) => {
  try {
    const result = await pool.query(
      `UPDATE document_shares
       SET revoked_at=COALESCE(revoked_at,now()),updated_at=now()
       WHERE id=$1 AND (owner_id=$2 OR $3='admin')
       RETURNING id,revoked_at`,
      [req.params.shareId, req.user.id, req.user.role]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'share_not_found' });
    await pool.query(
      `INSERT INTO share_access_logs (share_id,event,actor_id,ip_hash,user_agent_hash,metadata)
       VALUES ($1,'revoked',$2,$3,$4,$5)`,
      [req.params.shareId, req.user.id, hashClient(req.ip), hashClient(req.get('user-agent') || ''), {}]
    );
    return res.json({ ok: true, share: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

app.post('/api/shares/:shareId/rotate', auth, async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const found = await client.query(`SELECT * FROM document_shares WHERE id=$1 FOR UPDATE`, [req.params.shareId]);
    if (!found.rowCount || (String(found.rows[0].owner_id) !== String(req.user.id) && !isAdmin(req))) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'share_not_found' });
    }
    const current = found.rows[0];
    if (current.revoked_at) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'share_revoked' });
    }
    if (current.expires_at && new Date(current.expires_at).getTime() <= Date.now()) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'share_expired' });
    }

    const rawToken = issueToken();
    const updated = await client.query(
      `UPDATE document_shares
       SET token_hash=$1,updated_at=now()
       WHERE id=$2
       RETURNING id,document_id,revision_id,visibility,expires_at,revoked_at,policy`,
      [hashSecret(rawToken), req.params.shareId]
    );
    await audit(req, client, req.params.shareId, 'rotated', req.user.id, {});
    await client.query('COMMIT');
    return res.json({ share: updated.rows[0], accessToken: rawToken });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    next(error);
  } finally {
    client.release();
  }
});

app.get('/api/shares', auth, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id,document_id,revision_id,visibility,expires_at,revoked_at,policy,created_at,updated_at
       FROM document_shares
       WHERE owner_id=$1
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    return res.json({ shares: result.rows });
  } catch (error) {
    next(error);
  }
});

app.get('/api/shares/:shareId/audit', auth, async (req, res, next) => {
  try {
    const owner = await pool.query(`SELECT owner_id FROM document_shares WHERE id=$1`, [req.params.shareId]);
    if (!owner.rowCount || (String(owner.rows[0].owner_id) !== String(req.user.id) && !isAdmin(req))) {
      return res.status(404).json({ error: 'share_not_found' });
    }
    const result = await pool.query(
      `SELECT id,event,actor_id,ip_hash,user_agent_hash,metadata,occurred_at
       FROM share_access_logs
       WHERE share_id=$1
       ORDER BY occurred_at DESC
       LIMIT 500`,
      [req.params.shareId]
    );
    return res.json({ events: result.rows });
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'internal_server_error' });
});

const server = app.listen(port, () => console.log(`Secure Share Backend listening on :${port}`));
const shutdown = async () => {
  server.close();
  await pool.end();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
