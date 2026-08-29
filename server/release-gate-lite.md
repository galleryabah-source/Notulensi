# Notulensi Lite release gate

Production release requires all of these checks:

1. Vercel deployment READY.
2. `/notulensi-lite.html` returns HTTP 200.
3. Lite API rejects unauthenticated access.
4. Admin session can read shared Lite state.
5. Admin write persists and reads back from shared PostgreSQL storage.
6. Optimistic version conflict returns HTTP 409.
7. Full Notulensi and shared Admin login remain healthy.
8. No database migration or schema change is introduced by Lite release.
