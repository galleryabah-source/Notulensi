# Notulensi Lite Release Status — 2026-08-26

## Current state
Version B is merged to `main` in commit `24ca88439ac83e4f90600a93ec9bedca8fe89a46`.

The implementation is intentionally AI-independent and uses the existing Admin authentication boundary and `public.app_storage`. No new database schema or migration is introduced.

## Deployment gate
The Vercel project has produced successful preview deployments for earlier Lite commits, but the newest Lite commits after backend integration have also produced failed preview deployments. Production remains on the existing production deployment until a clean deployment of the merged `main` commit is verified.

## Required release verification
1. Vercel deployment for `main` commit `24ca88439ac83e4f90600a93ec9bedca8fe89a46` must be `READY`.
2. `/notulensi-lite.html` must return HTTP 200.
3. `/api/lite-health.js` must return HTTP 200 and identify Lite backend v1.
4. `/api/lite-data.js` must reject unauthenticated access.
5. Authenticated Admin GET must return shared persistence state.
6. Authenticated Admin PUT must enforce the Lite request header and optimistic versioning.
7. A write/read-back test must succeed against `public.app_storage`.
8. Existing Full app and Admin URLs must remain healthy.

Do not announce a production Lite URL until all release verification items pass.
