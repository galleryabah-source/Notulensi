# Notulensi Lite V1 release gate

- Production branch: main
- AI is not required by Lite.
- Shared persistence: public.app_storage.
- Admin authentication remains shared with the main Notulensi application.
- Deployment must stay within the Vercel Hobby serverless-function limit.
- Recording audio is local-only in IndexedDB; cloud persistence stores transcript/session metadata and an explicit `recordingId` link.
- Saving a session is blocked while recording is active or audio finalization is still in progress.
- Reload recovery verifies each persisted `recordingId` against local IndexedDB before advertising audio availability.
- Server-side AI config must use the canonical admin-session implementation and return the authenticated session role, never the auth function itself.
- GO LIVE requires a READY deployment, Lite regression CI PASS, and HTTP smoke tests for Lite HTML and API authentication.
- No database migration or schema change is part of the Lite release gate.
