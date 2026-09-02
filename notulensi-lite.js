(() => {
  'use strict';

  const store = window.notulensiLiteStorage;
  const recorder = window.NotulensiLiteRecorder;
  const transcription = window.NotulensiLiteTranscription;
  if (!store || !recorder || !transcription) throw new Error('NOTULENSI_LITE_ENGINE_UNAVAILABLE');

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
  const state = { sessions: [], version: 0, backend: false, recording: false, paused: false, recordingId: null, durationMs: 0, finalizing: false };

  function localLoad() {
    const p = store.read();
    state.sessions = Array.isArray(p.sessions) ? p.sessions : [];
    state.version = Number.isInteger(Number(p.version)) && Number(p.version) >= 0 ? Number(p.version) : 0;
  }

  function localSave() {
    if (!store.write({ sessions: state.sessions, version: state.version })) {
      setMessage('Penyimpanan lokal penuh atau tidak tersedia. Unduh transkrip untuk cadangan.');
    }
  }

  async function api(path, opt = {}) {
    const r = await fetch(path, {
      credentials: 'same-origin',
      cache: 'no-store',
      ...opt,
      headers: { 'Content-Type': 'application/json', ...(opt.headers || {}) }
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(d.error || `HTTP_${r.status}`), { status: r.status, data: d });
    return d;
  }

  function mergeSessions(remote) {
    const byId = new Map();
    for (const s of remote || []) if (s?.id) byId.set(s.id, s);
    for (const s of state.sessions) if (s?.id && !byId.has(s.id)) byId.set(s.id, s);
    state.sessions = [...byId.values()].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  }

  async function hydrate() {
    try {
      const a = await api('/api/admin-session.js');
      if (!a.authenticated) {
        setMessage('Mode lokal aktif. Login Admin hanya diperlukan untuk sinkronisasi cloud.');
        return;
      }
      const d = await api('/api/lite-data.js');
      const localBefore = state.sessions.map((s) => s.id).filter(Boolean);
      if (Array.isArray(d.data?.sessions)) mergeSessions(d.data.sessions);
      state.version = Number(d.version) || 0;
      state.backend = true;
      await recoverAudioLinks();
      renderHistory();
      const localOnly = state.sessions.some((s) => !d.data.sessions?.some((r) => r.id === s.id));
      if (localOnly && localBefore.length) await persist();
      else setMessage('Sinkronisasi cloud aktif.');
    } catch {
      state.backend = false;
      setMessage('Mode lokal aktif. Sinkronisasi cloud belum tersedia.');
    }
  }

  async function recoverAudioLinks() {
    await Promise.all(state.sessions.map(async (s) => {
      if (!s.recordingId) return;
      try {
        const a = await recorder.getRecording(s.recordingId);
        s.audioAvailable = Boolean(a?.blob);
      } catch {
        s.audioAvailable = false;
      }
    }));
    localSave();
  }

  async function persist() {
    localSave();
    if (!state.backend) return;
    try {
      const d = await api('/api/lite-data.js', {
        method: 'PUT',
        headers: { 'X-Notulensi-Lite-Request': '1' },
        body: JSON.stringify({ baseVersion: state.version, data: { sessions: state.sessions } })
      });
      if (d.conflict) {
        const local = state.sessions;
        state.sessions = d.data.sessions || [];
        mergeSessions(local);
        state.version = d.version;
        localSave();
        setMessage('Data berubah di sesi lain; data lokal yang belum ada dipertahankan.');
      } else {
        state.version = d.version;
        localSave();
      }
    } catch (e) {
      setMessage(e.status === 401 ? 'Sesi Admin berakhir; data tetap tersimpan lokal.' : 'Sinkronisasi cloud gagal; data tetap tersimpan lokal.');
    }
  }

  function setMessage(x) { $('message').textContent = x; }
  function setStatus(x, live = false) { $('status').textContent = x; $('dot').classList.toggle('live', live); }
  function fmt(ms) { return recorder.formatMs(ms); }
  function renderTimer(e) { $('timer').textContent = e.display || fmt(e.elapsed || 0); state.durationMs = e.elapsed || 0; }

  function renderHistory() {
    const h = $('history');
    if (!state.sessions.length) { h.innerHTML = '<div class="empty">Belum ada sesi tersimpan.</div>'; return; }
    h.innerHTML = state.sessions.map((s) => `<article class="history-item"><div class="history-main"><strong>${esc(s.title)}</strong><span>${esc(new Date(s.createdAt).toLocaleString('id-ID'))}</span></div><div class="muted">${fmt(s.durationMs || 0)} · ${s.audioAvailable ? 'audio lokal tersedia' : 'transkrip saja'}</div><p>${esc(s.text || '').slice(0, 360)}</p><div class="history-actions"><button class="ghost" data-load="${esc(s.id)}">Buka</button>${s.audioAvailable ? `<button class="ghost" data-audio="${esc(s.recordingId)}">Unduh Audio</button>` : ''}</div></article>`).join('');
  }

  function setControls() {
    const r = state.recording;
    $('start').disabled = r || state.finalizing;
    $('pause').disabled = !r || state.paused || state.finalizing;
    $('resume').disabled = !r || !state.paused || state.finalizing;
    $('stop').disabled = !r || state.finalizing;
    $('save').disabled = state.finalizing || r || !$('text').value.trim();
  }

  function refreshSupport() {
    const audio = !!window.MediaRecorder && !!navigator.mediaDevices?.getUserMedia;
    const speech = transcription.support();
    $('support').innerHTML = `<span class="support-chip ${audio ? 'ok' : 'bad'}">${audio ? '● Audio siap' : '● Audio tidak tersedia'}</span><span class="support-chip ${speech ? 'ok' : 'warn'}">${speech ? '● Transkrip siap' : '● Transkrip browser terbatas'}</span>`;
  }

  async function start() {
    try {
      transcription.reset($('text').value.trim());
      await recorder.start();
      state.recording = true;
      state.paused = false;
      state.recordingId = null;
      setStatus('Sedang merekam', true);
      setMessage('Mikrofon aktif. Anda dapat berbicara secara normal.');
      setControls();
      try { await transcription.start(); }
      catch { setMessage('Audio aktif; transkripsi browser tidak tersedia. Rekaman tetap berjalan.'); }
    } catch (e) {
      setStatus('Siap merekam');
      setMessage(e.message === 'MICROPHONE_API_UNAVAILABLE' ? 'Browser tidak menyediakan akses mikrofon.' : 'Akses mikrofon gagal. Periksa izin browser lalu coba lagi.');
    }
  }

  function pause() {
    recorder.pause();
    state.paused = true;
    transcription.stop();
    setStatus('Rekaman dijeda');
    setMessage('Rekaman dijeda.');
    setControls();
  }

  async function resume() {
    recorder.resume();
    state.paused = false;
    try { await transcription.start(); } catch { /* audio recording can continue */ }
    setStatus('Sedang merekam', true);
    setMessage('Rekaman dilanjutkan.');
    setControls();
  }

  async function stop() {
    if (!state.recording || state.finalizing) return;
    state.finalizing = true;
    setControls();
    try {
      transcription.stop();
      const meta = await recorder.stop();
      state.recording = false;
      state.paused = false;
      state.recordingId = meta?.id || null;
      state.durationMs = meta?.durationMs || state.durationMs;
      setStatus('Rekaman selesai');
      setMessage('Rekaman selesai dan audio lokal sudah diamankan. Periksa transkrip lalu simpan.');
    } catch {
      state.recording = false;
      state.paused = false;
      setStatus('Rekaman selesai');
      setMessage('Audio gagal difinalisasi; transkrip tetap dapat disimpan.');
    } finally {
      state.finalizing = false;
      setControls();
    }
  }

  async function save() {
    const text = $('text').value.trim();
    if (!text) { setMessage('Belum ada transkrip untuk disimpan.'); return; }
    if (state.recording || state.finalizing) { setMessage('Tunggu sampai rekaman selesai.'); return; }
    const title = $('title').value.trim() || `Sesi ${new Date().toLocaleString('id-ID')}`;
    let audio = null;
    if (state.recordingId) try { audio = await recorder.getRecording(state.recordingId); } catch { /* optional audio */ }
    const session = { id: `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, title, text, durationMs: state.durationMs, createdAt: new Date().toISOString(), recordingId: audio?.id || state.recordingId || null, audioAvailable: Boolean(audio?.blob) };
    state.sessions.unshift(session);
    await persist();
    renderHistory();
    setMessage(session.audioAvailable ? 'Sesi dan audio tersimpan.' : 'Sesi tersimpan tanpa audio lokal.');
  }

  function resetEditor() {
    if (state.recording || state.finalizing) { setMessage('Hentikan rekaman terlebih dahulu.'); return; }
    transcription.reset();
    $('title').value = '';
    $('text').value = '';
    state.durationMs = 0;
    state.recordingId = null;
    renderTimer({ elapsed: 0, display: '00:00:00' });
    setMessage('Sesi baru siap.');
    setControls();
  }

  function copy() {
    if (!navigator.clipboard?.writeText) { setMessage('Clipboard tidak tersedia.'); return; }
    navigator.clipboard.writeText($('text').value).then(() => setMessage('Transkrip disalin.')).catch(() => setMessage('Clipboard tidak tersedia.'));
  }

  function download() {
    const u = URL.createObjectURL(new Blob([$('text').value], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a'); a.href = u; a.download = `notulensi-lite-${Date.now()}.txt`; a.click();
    setTimeout(() => URL.revokeObjectURL(u), 1000);
  }

  window.addEventListener('notulensi:lite:timer', (e) => renderTimer(e.detail));
  window.addEventListener('notulensi:lite:stopped', (e) => { state.recordingId = e.detail.id; state.durationMs = e.detail.durationMs || state.durationMs; setControls(); });
  window.addEventListener('notulensi:lite:transcription:result', (e) => { $('text').value = e.detail.combined || ''; setControls(); });
  window.addEventListener('notulensi:lite:transcription:error', (e) => { if (state.recording) setMessage(`Transkripsi: ${e.detail.code || 'error'}. Rekaman audio tetap berjalan.`); });

  $('start').onclick = start;
  $('pause').onclick = pause;
  $('resume').onclick = resume;
  $('stop').onclick = stop;
  $('save').onclick = save;
  $('copy').onclick = copy;
  $('download').onclick = download;
  $('clear').onclick = resetEditor;
  $('text').oninput = setControls;
  $('history').onclick = async (e) => {
    const b = e.target.closest('[data-load],[data-audio]');
    if (!b) return;
    if (b.dataset.load) {
      const s = state.sessions.find((x) => x.id === b.dataset.load);
      if (s) {
        $('title').value = s.title;
        $('text').value = s.text || '';
        state.durationMs = s.durationMs || 0;
        state.recordingId = s.recordingId || null;
        renderTimer({ elapsed: state.durationMs, display: fmt(state.durationMs) });
        setMessage('Sesi dibuka untuk ditinjau.');
        setControls();
      }
    } else if (b.dataset.audio) {
      try { recorder.download(await recorder.getRecording(b.dataset.audio)); }
      catch { setMessage('Audio lokal tidak ditemukan.'); }
    }
  };

  localLoad();
  refreshSupport();
  renderTimer({ elapsed: 0, display: '00:00:00' });
  setControls();
  renderHistory();
  hydrate();
})();
