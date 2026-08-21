CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','deleted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES users(id),
  source_meeting_id TEXT,
  current_revision_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS document_revisions (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  revision_number INTEGER NOT NULL CHECK (revision_number > 0),
  content_hash TEXT NOT NULL,
  content TEXT NOT NULL,
  source_transcript_hash TEXT,
  source_analysis_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(document_id, revision_number)
);

ALTER TABLE documents
  DROP CONSTRAINT IF EXISTS documents_current_revision_fk;
ALTER TABLE documents
  ADD CONSTRAINT documents_current_revision_fk
  FOREIGN KEY (current_revision_id) REFERENCES document_revisions(id) DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE IF NOT EXISTS document_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  revision_id TEXT NOT NULL REFERENCES document_revisions(id),
  owner_id UUID NOT NULL REFERENCES users(id),
  token_hash TEXT NOT NULL UNIQUE,
  visibility TEXT NOT NULL DEFAULT 'unlisted' CHECK (visibility IN ('private','unlisted','public')),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  policy JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_shares_owner ON document_shares(owner_id);
CREATE INDEX IF NOT EXISTS idx_document_shares_revision ON document_shares(revision_id);
CREATE INDEX IF NOT EXISTS idx_document_shares_expiry ON document_shares(expires_at);

CREATE TABLE IF NOT EXISTS share_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id UUID NOT NULL REFERENCES document_shares(id) ON DELETE CASCADE,
  event TEXT NOT NULL CHECK (event IN ('created','resolved','denied','revoked','expired','rotated')),
  actor_id UUID REFERENCES users(id),
  ip_hash TEXT,
  user_agent_hash TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_share_access_logs_share ON share_access_logs(share_id, occurred_at DESC);
