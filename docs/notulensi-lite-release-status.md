# Notulensi Lite Release Gate — 2026-09-02

## Scope

Notulensi Lite is intentionally limited to:

- microphone recording with start, pause, resume, and stop;
- browser speech-to-text when supported;
- editable transcript;
- local recovery of audio through IndexedDB;
- local transcript persistence;
- optional shared backend persistence through the existing Admin authentication boundary.

Lite does **not** call AI endpoints and does not provide recap, summary, analysis, action items, sentiment, or AI-provider configuration.

## Data boundary

No database schema or migration is introduced. Lite metadata/transcripts use the existing `public.app_storage` table. Audio binary remains in browser IndexedDB and is not written into JSONB storage.

The backend reads the current Lite v2 key first and can read legacy Lite v1 transcript data for compatibility. Legacy meeting/recap data is not reintroduced into the Lite UI.

## Deployment gate

1. The candidate Vercel deployment must be `READY`.
2. `/notulensi-lite.html` must return HTTP 200.
3. `/api/lite-data.js` must reject unauthenticated requests and require the Lite request header for PUT.
4. Authenticated Admin GET must return Lite persistence state.
5. Authenticated Admin PUT must enforce optimistic versioning.
6. Existing Full app and Admin URLs must remain healthy.
7. Browser verification must cover microphone permission, recording timer, pause/resume, stop/finalization, transcript editing, local recovery, save, reload, and audio download.
8. Lite must remain independent of AI endpoints.

Do not promote a failed Preview deployment to Production and do not replace the current healthy Production deployment until the candidate passes this gate.
