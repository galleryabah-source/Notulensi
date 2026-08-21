import express from 'express';
import pg from 'pg';
import { authenticateRequest } from './auth.js';

const { Pool } = pg;
const app = express();
const port = Number(process.env.R2_2_PORT || 4182);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.use(express.json());

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, service: 'phase17-r2.2-auth-runtime' });
  } catch {
    res.status(503).json({ ok: false });
  }
});

const auth = (req, res, next) => authenticateRequest(req, res, next, pool);

app.get('/api/account/me', auth, (req, res) => {
  res.json({
    user: {
      id: req.account.id,
      email: req.account.email,
      status: req.account.status,
      role: req.account.role
    }
  });
});

app.get('/api/rbac/admin-check', auth, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'authorization_denied', reason: 'admin_role_required' });
  }
  return res.json({ authorized: true, role: req.user.role });
});

const server = app.listen(port, '127.0.0.1', () => {
  console.log(`R2.2 auth runtime listening on http://127.0.0.1:${port}`);
});

async function shutdown() {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
