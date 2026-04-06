-- =============================================================================
-- 003_users.up.sql
-- Application users (Clerk-integrated) + sessions audit columns
-- =============================================================================

CREATE TABLE app.users (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    clerk_user_id       varchar(100),              -- Clerk user id (ext. auth)
    email               citext NOT NULL,
    email_verified      boolean NOT NULL DEFAULT false,
    phone               varchar(40),
    first_name          varchar(100),
    last_name           varchar(100),
    display_name        varchar(200),
    avatar_url          text,
    locale              varchar(10) NOT NULL DEFAULT 'tr-TR',
    timezone            varchar(64) NOT NULL DEFAULT 'Europe/Istanbul',
    status              varchar(20) NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','invited','suspended','disabled')),
    primary_role        varchar(40) NOT NULL DEFAULT 'employee'
                        CHECK (primary_role IN ('super_admin','hr_director','people_partner','line_manager','employee','auditor','security_officer')),
    last_login_at       timestamptz,
    last_login_ip       inet,
    invited_by_user_id  uuid REFERENCES app.users(id) ON DELETE SET NULL,
    invited_at          timestamptz,
    invitation_accepted_at timestamptz,
    mfa_enabled         boolean NOT NULL DEFAULT false,
    preferences         jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    deleted_at          timestamptz,
    CONSTRAINT uq_users_tenant_email UNIQUE (tenant_id, email),
    CONSTRAINT uq_users_clerk UNIQUE (clerk_user_id)
);

CREATE INDEX idx_users_tenant          ON app.users(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_email_tenant    ON app.users(tenant_id, email);
CREATE INDEX idx_users_primary_role    ON app.users(tenant_id, primary_role);
CREATE INDEX idx_users_status          ON app.users(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_clerk_id        ON app.users(clerk_user_id) WHERE clerk_user_id IS NOT NULL;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON app.users
    FOR EACH ROW EXECUTE FUNCTION app.update_updated_at();

COMMENT ON TABLE app.users IS 'Uygulama kullanıcıları (Clerk auth ile entegre).';
COMMENT ON COLUMN app.users.clerk_user_id IS 'External Clerk user ID (e.g., user_2abc123).';
COMMENT ON COLUMN app.users.primary_role IS 'Ana RBAC rolü; fine-grained permissions role_assignments tablosunda.';
