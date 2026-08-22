# Admin Authentication — Vercel Environment Variables

Production admin authentication requires these Vercel Environment Variables:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD_HASH`
- `ADMIN_PASSWORD_SALT`
- `ADMIN_SESSION_SECRET`
- `DATABASE_URL`

Never commit the actual values to GitHub.

## Required verification

After adding the variables to the Vercel **Production** environment, redeploy the project and verify:

1. `POST /api/admin-login` with missing/incomplete configuration must not authenticate.
2. Correct credentials establish the HttpOnly admin session.
3. `GET /api/admin-session` returns `authenticated: true` only with that session.
4. `GET /admin-settings.html` without a session must not expose the admin application.
5. `PUT /api/monetization-config` without a session must return `401`.
6. A valid admin session may save monetization configuration to PostgreSQL.
7. Public application pages must not expose administrative controls.

## Password derivation

Use PBKDF2-SHA256 with 120000 iterations and a 32-byte derived key. Store only the derived hash and salt in Vercel Environment Variables; do not store or commit the plaintext password.
