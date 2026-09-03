(() => {
  'use strict';

  const DB_NAME = 'notulensi-lite-v2';
  const STORE = 'recordings';
  const state = {
    stream: null,
    recorder: null,
    chunks: [],
    startedAt: 0,
    elapsedBefore: 0,
    timer: null,
    id: null,
    finalized: null,
  };

  function openDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE)) {
          request.result.createObjectStore(STORE);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('INDEXEDDB_OPEN_FAILED'));
    });
  }

  async function put(key, value) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error || new Error('INDEXEDDB_WRITE_FAILED'));
      };
      tx.onabort = () => {
        db.close();
        reject(tx.error || new Error('INDEXEDDB_WRITE_ABORTED'));
      };
    });
  }

  async function get(key) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const request = tx.objectStore(STORE).get(key);
      request.onsuccess = () => {
        db.close();
        resolve(request.result);
      };
      request.onerror = () => {
        db.close();
        reject(request.error || new Error('INDEXEDDB_READ_FAILED'));
      };
    });
  }

  function formatMs(ms) {
    const seconds = Math.floor(ms / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainder = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
  }

  function mime() {
    return [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
    ].find((type) => window.MediaRecorder?.isTypeSupported?.(type)) || '';
  }

  function emit(name, detail = {}) {
    window.dispatchEvent(
      new CustomEvent(`notulensi:lite:${name}`, { detail }),
    );
  }

  function clearTimer() {
    if (state.timer) clearInterval(state.timer);
    state.timer = null;
  }

  function stopTracks() {
    state.stream?.getTracks?.().forEach((track) => track.stop());
    state.stream = null;
  }

  function tick() {
    const elapsed = state.elapsedBefore + (state.startedAt ? Date.now() - state.startedAt : 0);
    emit('timer', { elapsed, display: formatMs(elapsed) });
  }

  async function start() {
    if (state.recorder && state.recorder.state !== 'inactive') {
      throw new Error('RECORDER_ALREADY_ACTIVE');
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('MICROPHONE_API_UNAVAILABLE');
    }
    if (!window.MediaRecorder) {
      throw new Error('MEDIA_RECORDER_UNAVAILABLE');
    }

    state.chunks = [];
    state.elapsedBefore = 0;
    state.startedAt = 0;
    state.finalized = null;
    state.id = `rec_${Date.now()}_${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`;

    state.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    try {
      const type = mime();
      state.recorder = new MediaRecorder(
        state.stream,
        type ? { mimeType: type } : undefined,
      );

      state.recorder.ondataavailable = (event) => {
        if (event.data?.size) state.chunks.push(event.data);
      };

      state.recorder.onstart = () => {
        state.startedAt = Date.now();
        state.timer = setInterval(tick, 250);
        emit('state', { status: 'recording', id: state.id });
        tick();
      };

      state.recorder.onpause = () => {
        if (state.startedAt) state.elapsedBefore += Date.now() - state.startedAt;
        state.startedAt = 0;
        emit('state', { status: 'paused', id: state.id });
        tick();
      };

      state.recorder.onresume = () => {
        state.startedAt = Date.now();
        emit('state', { status: 'recording', id: state.id });
      };

      state.recorder.onstop = async () => {
        let meta = null;
        let error = null;

        try {
          if (state.startedAt) state.elapsedBefore += Date.now() - state.startedAt;
          state.startedAt = 0;
          clearTimer();

          const blob = new Blob(state.chunks, {
            type: state.recorder?.mimeType || type || 'audio/webm',
          });

          meta = {
            id: state.id,
            mimeType: blob.type,
            size: blob.size,
            durationMs: state.elapsedBefore,
            createdAt: new Date().toISOString(),
            blob,
          };

          await put(state.id, meta);
          state.finalized = meta;
        } catch (finalizeError) {
          error = finalizeError instanceof Error
            ? finalizeError
            : new Error('RECORDER_FINALIZE_FAILED');
        } finally {
          stopTracks();
          state.recorder = null;
          state.chunks = [];
        }

        if (error) {
          emit('error', { error });
          return;
        }

        emit('stopped', meta);
        tick();
      };

      state.recorder.start(1000);
    } catch (error) {
      stopTracks();
      state.recorder = null;
      state.chunks = [];
      state.startedAt = 0;
      clearTimer();
      throw error instanceof Error ? error : new Error('RECORDER_INIT_FAILED');
    }
  }

  function pause() {
    if (state.recorder?.state === 'recording') state.recorder.pause();
  }

  function resume() {
    if (state.recorder?.state === 'paused') state.recorder.resume();
  }

  function stop() {
    if (!state.recorder || state.recorder.state === 'inactive') {
      return Promise.resolve(state.finalized);
    }

    return new Promise((resolve, reject) => {
      const ok = (event) => {
        cleanup();
        resolve(event.detail);
      };
      const bad = (event) => {
        cleanup();
        reject(event.detail?.error || new Error('RECORDER_FINALIZE_FAILED'));
      };
      const cleanup = () => {
        window.removeEventListener('notulensi:lite:stopped', ok);
        window.removeEventListener('notulensi:lite:error', bad);
      };

      window.addEventListener('notulensi:lite:stopped', ok, { once: true });
      window.addEventListener('notulensi:lite:error', bad, { once: true });

      try {
        state.recorder.stop();
      } catch (error) {
        cleanup();
        stopTracks();
        state.recorder = null;
        clearTimer();
        reject(error instanceof Error ? error : new Error('RECORDER_STOP_FAILED'));
      }
    });
  }

  function getRecording(id) {
    return get(id);
  }

  function download(recording) {
    if (!recording?.blob) throw new Error('RECORDING_NOT_FOUND');
    const url = URL.createObjectURL(recording.blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `notulensi-${recording.id}.${recording.mimeType.includes('mp4') ? 'mp4' : 'webm'}`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  window.NotulensiLiteRecorder = Object.freeze({
    start,
    pause,
    resume,
    stop,
    getRecording,
    download,
    formatMs,
  });
})();
