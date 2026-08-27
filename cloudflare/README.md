# Notulensi Lite — Cloudflare deployment

This branch is an isolated Cloudflare deployment path for Notulensi Lite.

## Current deployment boundary
- Frontend is served from repository assets.
- `/api/lite-health` is served by the Cloudflare Worker.
- Existing Vercel deployment is unchanged.
- Production database credentials are never committed to Git.
- The PostgreSQL-backed Lite adapter is not enabled in this minimal deployment until Cloudflare-compatible database access is verified.

## Deployment
Use the Cloudflare Worker project `notulensi-lite` and connect it to this branch.

`npx wrangler deploy`

## Verification
- `/notulensi-lite.html` should return HTTP 200.
- `/api/lite-health` should return JSON with `ok: true` and `version: "v1"`.

## Next gate
Before enabling persistent `/api/lite-data`, implement and verify a Cloudflare-compatible persistence adapter. Do not expose `DATABASE_URL` to frontend assets or commit it to GitHub.
