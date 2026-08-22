CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS users (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),email TEXT NOT NULL UNIQUE,status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','suspended','deleted')),role TEXT NOT NULL DEFAULT 'user',created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS r2_3_resources (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS r2_3_audit_logs (id BIGSERIAL PRIMARY KEY, actor_id UUID NOT NULL REFERENCES users(id), action TEXT NOT NULL, payload JSONB NOT NULL DEFAULT '{}'::jsonb, previous_hash TEXT, entry_hash TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS r2_3_audit_created_idx ON r2_3_audit_logs(created_at,id);
