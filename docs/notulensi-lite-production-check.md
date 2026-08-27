# Notulensi Lite — Production Verification

## Architecture
- Static/browser-local Lite only.
- No `/api/*` functions are required by the Lite page.
- Transcripts use localStorage.
- Latest recording uses IndexedDB.

## Functional smoke test
1. Open the Lite deployment.
2. Confirm Dashboard, Rekam, and Transkrip render.
3. Press **Mulai rekam** and grant microphone permission.
4. Record briefly, press **Berhenti**.
5. Confirm preview appears and **Simpan audio** is enabled.
6. Reload the page and confirm the latest recording is still available.
7. Create a transcript and reload; confirm it remains listed.
8. Download the recording and confirm the `.webm` file is produced.

## Safety boundary
Lite must not depend on Full-app admin, AI, monetization, SEO, intelligence, or local-AI API endpoints.

## Release gate
- Deployment state must be `READY`.
- Browser smoke test must pass.
- Do not merge Lite branch into `main` until the Lite release is explicitly approved.
