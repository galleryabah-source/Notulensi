/* PHASE 4.19 — security hardening utilities */
(function (global) {
  'use strict';
  const SECRET_KEYS = ['authorization', 'cookie', 'token', 'rawToken', 'bearerToken', 'apiKey', 'password', 'secret'];
  const clone = (v) => JSON.parse(JSON.stringify(v));

  function redact(value) {
    if (Array.isArray(value)) return value.map(redact);
    if (!value || typeof value !== 'object') return value;
    const out = {};
    Object.keys(value).forEach((key) => { out[key] = SECRET_KEYS.includes(key.toLowerCase()) ? '[REDACTED]' : redact(value[key]); });
    return out;
  }

  function requestId(input) {
    const v = String(input || '').trim();
    if (v && v.length <= 128) return v;
    return 'req-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function validateSize(value, max, field) {
    if (value == null) return true;
    const size = typeof value === 'string' ? value.length : JSON.stringify(value).length;
    if (size > max) throw new Error((field || 'input') + ' exceeds maximum size');
    return true;
  }

  function validateOrigin(origin, allowedOrigins, enabled) {
    if (!enabled) return true;
    return typeof origin === 'string' && Array.isArray(allowedOrigins) && allowedOrigins.includes(origin);
  }

  function createRateLimiter(policy) {
    const p = Object.assign({ limit: 60, windowMs: 60000 }, policy || {});
    if (!Number.isInteger(p.limit) || p.limit < 1 || !Number.isInteger(p.windowMs) || p.windowMs < 1000) throw new Error('invalid rate limit policy');
    const buckets = new Map();
    return {
      check(key, nowMs) {
        const k = String(key || 'anonymous'); const now = Number.isFinite(nowMs) ? nowMs : Date.now(); const current = buckets.get(k);
        if (!current || now - current.startedAt >= p.windowMs) { buckets.set(k, { startedAt: now, count: 1 }); return { allowed: true, remaining: p.limit - 1, resetAt: now + p.windowMs }; }
        if (current.count >= p.limit) return { allowed: false, remaining: 0, resetAt: current.startedAt + p.windowMs };
        current.count += 1; return { allowed: true, remaining: p.limit - current.count, resetAt: current.startedAt + p.windowMs };
      },
      clear(key) { buckets.delete(String(key || 'anonymous')); },
    };
  }

  function sanitizeAuditMetadata(metadata) { return redact(clone(metadata || {})); }

  function runPhase419SelfTest() {
    const limiter = createRateLimiter({ limit: 2, windowMs: 10000 });
    const a = limiter.check('u1', 1000), b = limiter.check('u1', 1001), c = limiter.check('u1', 1002), d = limiter.check('u1', 11001);
    const redacted = sanitizeAuditMetadata({ token: 'secret', nested: { password: 'pw', ok: 'yes' } });
    const checks = {
      requestIdStable: requestId('abc') === 'abc',
      secretRedacted: redacted.token === '[REDACTED]' && redacted.nested.password === '[REDACTED]',
      rateAllowsWithinLimit: a.allowed && b.allowed,
      rateDeniesOverflow: !c.allowed,
      rateResets: d.allowed,
      originAllow: validateOrigin('https://example.test', ['https://example.test'], true),
      originDeny: !validateOrigin('https://evil.test', ['https://example.test'], true),
      sizeReject: (() => { try { validateSize('12345', 4, 'x'); return false; } catch (e) { return true; } })(),
    };
    const failed = Object.keys(checks).filter((k) => !checks[k]); return { phase: '4.19', passed: failed.length === 0, checks, failed };
  }
  global.createRateLimiterV419 = createRateLimiter;
  global.redactSecurityDataV419 = redact;
  global.validateSecurityOriginV419 = validateOrigin;
  global.runPhase419SelfTest = runPhase419SelfTest;
})(typeof window !== 'undefined' ? window : globalThis);
