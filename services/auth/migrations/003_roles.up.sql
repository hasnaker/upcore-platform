-- 003_roles.up.sql
-- RBAC: roles + user_roles + rbac_policies.

CREATE TABLE IF NOT EXISTS roles (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    UUID,                  -- NULL = system-wide role
    name         TEXT NOT NULL,
    description  TEXT NOT NULL DEFAULT '',
    is_system    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_roles_scope_name
    ON roles (COALESCE(tenant_id::text, ''), name);
CREATE INDEX IF NOT EXISTS idx_roles_tenant ON roles (tenant_id);

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS roles_tenant_isolation ON roles;
CREATE POLICY roles_tenant_isolation ON roles
    USING (
        tenant_id IS NULL
        OR current_setting('app.tenant_id', true) IS NULL
        OR current_setting('app.tenant_id', true) = ''
        OR tenant_id::text = current_setting('app.tenant_id', true)
    );

CREATE TABLE IF NOT EXISTS user_roles (
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id     UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    tenant_id   UUID NOT NULL,
    granted_by  UUID,
    granted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_tenant ON user_roles (tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles (role_id);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_roles_tenant_isolation ON user_roles;
CREATE POLICY user_roles_tenant_isolation ON user_roles
    USING (
        current_setting('app.tenant_id', true) IS NULL
        OR current_setting('app.tenant_id', true) = ''
        OR tenant_id::text = current_setting('app.tenant_id', true)
    );

CREATE TABLE IF NOT EXISTS rbac_policies (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID,                       -- NULL = system policy
    role_id     UUID REFERENCES roles(id) ON DELETE CASCADE,
    resource    TEXT NOT NULL,
    action      TEXT NOT NULL,
    effect      TEXT NOT NULL DEFAULT 'allow'
                CHECK (effect IN ('allow', 'deny')),
    conditions  JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rbac_policies_role ON rbac_policies (role_id);
CREATE INDEX IF NOT EXISTS idx_rbac_policies_lookup
    ON rbac_policies (role_id, resource, action);

ALTER TABLE rbac_policies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rbac_policies_tenant_isolation ON rbac_policies;
CREATE POLICY rbac_policies_tenant_isolation ON rbac_policies
    USING (
        tenant_id IS NULL
        OR current_setting('app.tenant_id', true) IS NULL
        OR current_setting('app.tenant_id', true) = ''
        OR tenant_id::text = current_setting('app.tenant_id', true)
    );
