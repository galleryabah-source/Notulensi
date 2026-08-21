import http from 'node:http';
import { config } from './config.mjs';
import { getPool, closePool } from './db/client.mjs';

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store'
  });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  if (req.method !== 'GET') {
    sendJson(res, 405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
    return;
  }

  if (req.url === '/health') {
    try {
      await getPool().query('SELECT 1');
      sendJson(res, 200, {
        ok: true,
        service: 'meeting-intelligence-runtime',
        database: 'ok'
      });
    } catch (error) {
      sendJson(res, 503, {
        ok: false,
        service: 'meeting-intelligence-runtime',
        database: 'unavailable'
      });
    }
    return;
  }

  sendJson(res, 404, { ok: false, error: 'NOT_FOUND' });
});

server.listen(config.port, config.host, () => {
  console.log(`Runtime listening on http://${config.host}:${config.port}`);
});

async function shutdown(signal) {
  console.log(`Received ${signal}; shutting down`);
  server.close(async () => {
    await closePool();
    process.exit(0);
  });
}

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));
