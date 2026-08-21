const integerEnv = (name, fallback) => {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw new Error(`${name} must be a valid TCP port`);
  }
  return value;
};

export const config = Object.freeze({
  host: process.env.HOST || '127.0.0.1',
  port: integerEnv('PORT', 8787),
  databaseUrl: process.env.DATABASE_URL || '',
  nodeEnv: process.env.NODE_ENV || 'development'
});

export function requireDatabaseUrl() {
  if (!config.databaseUrl) {
    throw new Error('DATABASE_URL is required for database operations');
  }
  return config.databaseUrl;
}
