/* AI provider compatibility bridge.
 * Keeps the existing Phase 2 intelligence engine compatible with the
 * schema-backed provider settings without changing its generation logic.
 */
(function(){
  'use strict';
  const SETTINGS_KEY = 'meeting_ai_provider_settings_v1';
  const HEALTH_KEY = 'meeting_ai_provider_health_v1';
  const LEGACY_SETTINGS_KEY = 'meeting_ai_settings';
  const LEGACY_KEYS = [
    'geminiApiKey',
    'geminiAPIKey',
    'gemini_api_key',
    'GEMINI_API_KEY',
    'googleGeminiApiKey',
    'google_gemini_api_key'
  ];

  function read(key){
    try { return JSON.parse(localStorage.getItem(key) || '{}'); }
    catch(e){ return {}; }
  }

  function sync(){
    const settings = read(SETTINGS_KEY);
    const health = read(HEALTH_KEY);
    const gemini = settings && settings.gemini ? settings.gemini : {};
    const key = String(gemini.key || '').trim();
    const model = String(gemini.model || 'gemini-2.5-flash').trim();
    const healthy = Boolean(health && health.gemini && health.gemini.healthy && key);

    // Expose compatibility globals for legacy Phase 2 code.
    window.geminiApiKey = key;
    window.geminiAPIKey = key;
    window.GEMINI_API_KEY = key;
    window.googleGeminiApiKey = key;
    window.geminiModel = model;
    window.geminiConfigured = Boolean(key);
    window.geminiHealthy = healthy;

    // The existing Phase 2 engine actually reads meeting_ai_settings.apiKey.
    // Keep that legacy object synchronized with the provider registry so the
    // user does not have to enter the same Gemini key twice.
    try {
      const legacy = read(LEGACY_SETTINGS_KEY);
      const merged = {
        ...legacy,
        apiKey: key,
        template: legacy.template || ''
      };
      localStorage.setItem(LEGACY_SETTINGS_KEY, JSON.stringify(merged));
    } catch(e) {}

    // Mirror the current user-provided key for older integrations too.
    if (key) LEGACY_KEYS.forEach(k => { try { localStorage.setItem(k, key); } catch(e) {} });
    else LEGACY_KEYS.forEach(k => { try { localStorage.removeItem(k); } catch(e) {} });

    // If the legacy runtime is already initialized, update its in-memory
    // settings immediately instead of requiring a reload.
    try {
      if (window.appSettings && typeof window.appSettings === 'object') {
        window.appSettings.apiKey = key;
        if (model) window.appSettings.geminiModel = model;
        if (typeof window.updateApiBadge === 'function') window.updateApiBadge();
      }
    } catch(e) {}

    return {key, model, healthy};
  }

  window.getConfiguredGeminiProvider = sync;
  window.addEventListener('storage', e => {
    if (e.key === SETTINGS_KEY || e.key === HEALTH_KEY || e.key === LEGACY_SETTINGS_KEY) sync();
  });
  window.addEventListener('message', e => {
    if (e.data && e.data.type === 'meeting-ai-settings-updated') sync();
  });
  sync();
})();