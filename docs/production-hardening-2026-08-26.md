# Notulensi — Production Hardening 2026-08-26

## Completed

- Supabase anonymous access to `public.app_storage` revoked.
- Unused `public.table_name` removed after confirming it had zero rows and no application dependency in the current public schema audit.
- Anonymous/authenticated execution revoked for public SECURITY DEFINER helper functions flagged by Security Advisor.
- Remaining Supabase Security Advisor finding is leaked-password protection, which requires Supabase Auth configuration rather than repository SQL.
- Production deployment for commit `57d473d60e6e276b8a146b7da8ecb61d7553a864` is READY.

## Runtime findings

- PostgreSQL SSL warning is caused by connection-string SSL semantics. Application database configuration should use explicit SSL verification rather than relying on legacy `sslmode` aliases.
- `url.parse()` warning is reported from `/api/ai-runtime`; repository application code already uses WHATWG `URL` in the inspected AI configuration path. The remaining warning should therefore be traced to the runtime dependency stack before changing unrelated application code.
- Production AI readiness remains separately gated by provider/environment configuration.

## Safety boundary

No production AI secret, database secret, or credential is committed to the repository. Database security changes were applied through a migration and verified with Security Advisor.
