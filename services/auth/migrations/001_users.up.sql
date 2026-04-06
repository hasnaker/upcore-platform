-- 001_users.up.sql
-- Users owned by auth service; RLS enforced on tenant_id.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_id    TEXT NOT NULL UNIQUE,
    tenant_id   UUID NOT NULL,
    email       TEXT NOT NULL,
    first_name  TEXT NOT NULL DEFAULT '',
    last_name   TEXT NOT NULL DEFAULT '',
    locale      TEXT NOT NULL DEFAULT 'tr-TR',
    status      TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'suspended', 'deleted', 'invited')),
    metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users (clerk_id);
CREATE INDEX IF NOT EXISTS idx_users_tenant_email ON users (tenant_id, email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_tenant_status ON users (tenant_id, status);

-- Case-insensitive uniqueness of email within a tenant
CREATE UNIQUE INDEX IF NOT EXISTS ux_users_tenant_email_lower
    ON users (tenant_id, LOWER(email))
    WHERE deleted_at IS NULL;

-- Enable row-level security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: tenants can only see their own rows (except when app.tenant_id is not set)
DROP POLICY IF EXISTS users_tenant_isolation ON users;
CREATE POLICY users_tenant_isolation ON users
    USING (
        current_setting('app.tenant_id', true) IS NULL
        OR current_setting('app.tenant_id', true) = ''
        OR tenant_id::text = current_setting('app.tenant_id', true)
    );
