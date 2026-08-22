import { Pool } from 'pg';
import { requireAdmin } from './_admin-auth.js';

const DEFAULT_CONFIG = {
  enabled: true,
  adsense: { enabled: false, publisherId: '', slots: {} },
  affiliate: {
    enabled: true,
    network: 'Shopee Affiliate',
    disclosure: 'Rekomendasi ini menggunakan tautan afiliasi Shopee. Jika Anda membeli melalui tautan tersebut, pengelola dapat menerima komisi tanpa biaya tambahan bagi Anda.',
    items: [
      { id: 'meeting-tools', title: 'Perlengkapan rapat & presentasi', description: 'Rekomendasi produk yang relevan untuk rapat, presentasi, dan dokumentasi.', url: '', label: 'Lihat di Shopee' },
      { id: 'productivity', title: 'Perlengkapan produktivitas', description: 'Pilihan produk pendukung pekerjaan dan pengelolaan dokumen.', url: '', label: 'Lihat di Shopee' },
      { id: 'audio', title: 'Peralatan audio rapat', description: 'Produk pendukung rekaman suara dan transkripsi rapat.', url: '', label: 'Lihat di Shopee' }
    ]
  },
  premium: { enabled: false, upgradeUrl: '', benefits: [] },
  privacy: { privacyUrl: './privacy-policy.html', termsUrl: './terms.html' }
};

let pool;
function db() {
  const connectionString =
    process.env.DATABASE_URL ||
    process.env.notulensi_POSTGRES_URL ||
    process.env.notulensi_POSTGRES_PRISMA_URL ||
    process.env.notulensi_DATABASE_URL_UNPOOLED;

  if (!connectionString) throw new Error('DATABASE_URL is not configured.');
  if (!pool) {
    pool = new Pool({
      connectionString,
      max: 2,
      ssl: process.env.DATABASE_SSL === 'disable' ? false : { rejectUnauthorized: false }
    });
  }
  return pool;
}

function mergeConfig(value) {
  const o = value && typeof value === 'object' ? value : {};
  return {
    ...DEFAULT_CONFIG,
    ...o,
    affiliate: { ...DEFAULT_CONFIG.affiliate, ...(o.affiliate || {}), items: Array.isArray(o.affiliate?.items) ? o.affiliate.items : DEFAULT_CONFIG.affiliate.items },
    adsense: { ...DEFAULT_CONFIG.adsense, ...(o.adsense || {}) },
    premium: { ...DEFAULT_CONFIG.premium, ...(o.premium || {}) },
    privacy: { ...DEFAULT_CONFIG.privacy, ...(o.privacy || {}) }
  };
}

function validate(config) {
  const c = mergeConfig(config);
  if (!Array.isArray(c.affiliate.items) || c.affiliate.items.length > 100) throw new Error('Invalid affiliate items.');
  for (const item of c.affiliate.items) {
    for (const key of ['id', 'title', 'description', 'url', 'label']) {
      if (typeof item[key] !== 'string' || item[key].length > 2000) throw new Error(`Invalid affiliate item field: ${key}`);
    }
  }
  return c;
}

async function ensureTable(client) {
  await client.query(`CREATE TABLE IF NOT EXISTS notulensi_monetization_config (config_key TEXT PRIMARY KEY, config JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET' && req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });
  let session = null;
  if (req.method === 'PUT') {
    session = requireAdmin(req, res);
    if (!session) return;
  }

  let client;
  try {
    client = await db().connect();
    await ensureTable(client);
    if (req.method === 'GET') {
      const result = await client.query('SELECT config FROM notulensi_monetization_config WHERE config_key = $1', ['default']);
      return res.status(200).json({ config: mergeConfig(result.rows[0]?.config || {}), updated: Boolean(result.rows[0]) });
    }
    const config = validate(req.body?.config || req.body);
    await client.query(`INSERT INTO notulensi_monetization_config(config_key, config, updated_at) VALUES($1,$2::jsonb,NOW()) ON CONFLICT(config_key) DO UPDATE SET config=EXCLUDED.config, updated_at=NOW()`, ['default', JSON.stringify(config)]);
    return res.status(200).json({ saved: true, config, role: session.role });
  } catch (error) {
    console.error('monetization-config', error);
    return res.status(503).json({ error: 'Server-side monetization storage is unavailable.' });
  } finally {
    if (client) client.release();
  }
}
