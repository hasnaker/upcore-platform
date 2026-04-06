-- =============================================================================
-- 004_roles_permissions.up.sql
-- RBAC: roles, permissions, role_permissions, user_role_assignments
-- =============================================================================

CREATE TABLE app.roles (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   uuid REFERENCES app.tenants(id) ON DELETE CASCADE,  -- NULL = global
    code        varchar(60) NOT NULL,
    name_tr     varchar(120) NOT NULL,
    name_en     varchar(120) NOT NULL,
    description text,
    is_system   boolean NOT NULL DEFAULT false,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_roles_scope_code UNIQUE (tenant_id, code)
);

CREATE TABLE app.permissions (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code         varchar(100) NOT NULL UNIQUE,
    resource     varchar(60)  NOT NULL,
    action       varchar(40)  NOT NULL,
    description  text,
    created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.role_permissions (
    role_id       uuid NOT NULL REFERENCES app.roles(id) ON DELETE CASCADE,
    permission_id uuid NOT NULL REFERENCES app.permissions(id) ON DELETE CASCADE,
    granted_at    timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE app.user_role_assignments (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    user_id         uuid NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
    role_id         uuid NOT NULL REFERENCES app.roles(id) ON DELETE RESTRICT,
    scope_type      varchar(30) NOT NULL DEFAULT 'tenant'
                    CHECK (scope_type IN ('tenant','department','team','employee')),
    scope_ref       uuid,
    assigned_by     uuid REFERENCES app.users(id) ON DELETE SET NULL,
    assigned_at     timestamptz NOT NULL DEFAULT now(),
    expires_at      timestamptz,
    revoked_at      timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_role_scope UNIQUE (user_id, role_id, scope_type, scope_ref)
);

CREATE INDEX idx_roles_tenant               ON app.roles(tenant_id);
CREATE INDEX idx_user_role_assignments_user ON app.user_role_assignments(user_id);
CREATE INDEX idx_user_role_assignments_tnt  ON app.user_role_assignments(tenant_id);
CREATE INDEX idx_user_role_assignments_role ON app.user_role_assignments(role_id);
CREATE INDEX idx_user_role_assignments_active ON app.user_role_assignments(user_id) WHERE revoked_at IS NULL;

CREATE TRIGGER trg_roles_updated_at
    BEFORE UPDATE ON app.roles
    FOR EACH ROW EXECUTE FUNCTION app.update_updated_at();

CREATE TRIGGER trg_user_role_assignments_updated_at
    BEFORE UPDATE ON app.user_role_assignments
    FOR EACH ROW EXECUTE FUNCTION app.update_updated_at();

-- Seed baseline system permissions -------------------------------------------
INSERT INTO app.permissions (code, resource, action, description) VALUES
    ('employees.read',        'employees',      'read',     'Read employee records'),
    ('employees.write',       'employees',      'write',    'Create/update employee records'),
    ('employees.delete',      'employees',      'delete',   'Soft-delete employees'),
    ('assessments.read',      'assessments',    'read',     'Read assessments'),
    ('assessments.write',     'assessments',    'write',    'Create/submit assessments'),
    ('assessments.score',     'assessments',    'score',    'Trigger scoring jobs'),
    ('burnout.read',          'burnout',        'read',     'Read burnout signals and predictions'),
    ('interventions.read',    'interventions',  'read',     'Read intervention catalog'),
    ('interventions.assign',  'interventions',  'assign',   'Assign interventions to employees'),
    ('surveys.manage',        'surveys',        'manage',   'Create and manage surveys'),
    ('reports.read',          'reports',        'read',     'Read analytics reports'),
    ('users.manage',          'users',          'manage',   'Manage users within tenant'),
    ('audit.read',            'audit',          'read',     'Read audit logs'),
    ('tenant.settings',       'tenant',         'settings', 'Modify tenant settings')
ON CONFLICT (code) DO NOTHING;

COMMENT ON TABLE app.roles IS 'RBAC rolleri — global (tenant_id NULL) veya tenant-specific.';
COMMENT ON TABLE app.permissions IS 'Sistem genelinde yetki tanımları (resource.action).';
COMMENT ON TABLE app.user_role_assignments IS 'Kullanıcıya scope ile rol atama (tenant/department/team/employee).';
