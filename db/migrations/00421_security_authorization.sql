BEGIN;

CREATE TABLE IF NOT EXISTS auth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL UNIQUE,
  user_id text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','REVOKED','EXPIRED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  rotated_from_session_id text,
  ip_hash text,
  user_agent_hash text,
  CHECK (revoked_at IS NULL OR status = 'REVOKED')
);

CREATE TABLE IF NOT EXISTS share_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id text NOT NULL UNIQUE,
  resource_type text NOT NULL CHECK (resource_type IN ('MEETING','DOCUMENT','DOCUMENT_REVISION','DOCUMENT_PACK','ACTION_ITEM','DECISION')),
  resource_id text NOT NULL,
  owner_user_id text NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','REVOKED','EXPIRED')),
  permission text NOT NULL CHECK (permission IN ('VIEW','COMMENT','DOWNLOAD','EDIT','MANAGE')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_by text NOT NULL,
  revoked_by text,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  CHECK (revoked_at IS NULL OR status = 'REVOKED')
);

CREATE TABLE IF NOT EXISTS share_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id text NOT NULL REFERENCES share_records(share_id) ON DELETE RESTRICT,
  recipient_type text NOT NULL CHECK (recipient_type IN ('USER','EMAIL','LINK','ORGANIZATION')),
  recipient_key text NOT NULL,
  permission text NOT NULL CHECK (permission IN ('VIEW','COMMENT','DOWNLOAD','EDIT','MANAGE')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  CHECK (revoked_at IS NULL OR revoked_at <= now())
);

CREATE TABLE IF NOT EXISTS token_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL REFERENCES auth_sessions(session_id) ON DELETE RESTRICT,
  event_type text NOT NULL CHECK (event_type IN ('ISSUED','ROTATED','REVOKED','EXPIRED','REJECTED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  request_id text,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS revocation_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type text NOT NULL CHECK (subject_type IN ('SESSION','SHARE','RECIPIENT')),
  subject_id text NOT NULL,
  reason text NOT NULL,
  revoked_at timestamptz NOT NULL DEFAULT now(),
  revoked_by text,
  request_id text
);

CREATE TABLE IF NOT EXISTS authorization_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id text NOT NULL,
  actor_user_id text,
  session_id text,
  operation text NOT NULL,
  resource_type text,
  resource_id text,
  decision text NOT NULL CHECK (decision IN ('ALLOW','DENY')),
  reason_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_status ON auth_sessions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires ON auth_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_share_records_resource ON share_records(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_share_records_expires ON share_records(expires_at);
CREATE INDEX IF NOT EXISTS idx_share_recipients_share ON share_recipients(share_id);
CREATE INDEX IF NOT EXISTS idx_share_recipients_key ON share_recipients(recipient_type, recipient_key);
CREATE INDEX IF NOT EXISTS idx_token_events_session ON token_events(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_revocation_subject ON revocation_records(subject_type, subject_id, revoked_at);
CREATE INDEX IF NOT EXISTS idx_authorization_audit_request ON authorization_audit(request_id);
CREATE INDEX IF NOT EXISTS idx_authorization_audit_resource ON authorization_audit(resource_type, resource_id, created_at);

-- Security boundary: audit rows are append-only.
CREATE OR REPLACE FUNCTION deny_authorization_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'authorization_audit is append-only';
END;
$$;

DROP TRIGGER IF EXISTS authorization_audit_no_update ON authorization_audit;
CREATE TRIGGER authorization_audit_no_update
BEFORE UPDATE OR DELETE ON authorization_audit
FOR EACH ROW EXECUTE FUNCTION deny_authorization_audit_mutation();

-- Revocation history is append-only as well.
CREATE OR REPLACE FUNCTION deny_revocation_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'revocation_records is append-only';
END;
$$;

DROP TRIGGER IF EXISTS revocation_records_no_update ON revocation_records;
CREATE TRIGGER revocation_records_no_update
BEFORE UPDATE OR DELETE ON revocation_records
FOR EACH ROW EXECUTE FUNCTION deny_revocation_mutation();

COMMIT;
