-- 004_rbac_rules.up.sql
-- Seed system roles and default RBAC policies (tenant_id = NULL, is_system = TRUE).

INSERT INTO roles (id, tenant_id, name, description, is_system)
VALUES
    (gen_random_uuid(), NULL, 'super_admin',   'Full system access across tenants', TRUE),
    (gen_random_uuid(), NULL, 'tenant_admin',  'Full access within a tenant',       TRUE),
    (gen_random_uuid(), NULL, 'hr_director',   'HR director with full org view',    TRUE),
    (gen_random_uuid(), NULL, 'hr_manager',    'HR manager for department',         TRUE),
    (gen_random_uuid(), NULL, 'line_manager',  'Manager over direct reports',       TRUE),
    (gen_random_uuid(), NULL, 'employee',      'Standard employee',                 TRUE),
    (gen_random_uuid(), NULL, 'candidate',     'Assessment candidate (limited)',    TRUE)
ON CONFLICT DO NOTHING;

-- Default policies keyed by role name via subquery.
INSERT INTO rbac_policies (id, tenant_id, role_id, resource, action, effect)
SELECT gen_random_uuid(), NULL, r.id, res, act, 'allow'
FROM roles r
JOIN (VALUES
    ('super_admin',  '*',          '*'),
    ('tenant_admin', 'tenant',     '*'),
    ('tenant_admin', 'self',       '*'),
    ('tenant_admin', 'team',       '*'),
    ('tenant_admin', 'department', '*'),

    ('hr_director',  'tenant',     'read:employees'),
    ('hr_director',  'tenant',     'manage:employees'),
    ('hr_director',  'tenant',     'view:all'),
    ('hr_director',  'tenant',     'manage:interventions'),
    ('hr_director',  'tenant',     'approve:high'),

    ('hr_manager',   'department', 'manage:employees'),
    ('hr_manager',   'department', 'read:employees'),
    ('hr_manager',   'department', 'view:department'),
    ('hr_manager',   'department', 'create:interventions'),

    ('line_manager', 'team',       'view:team'),
    ('line_manager', 'team',       'read:employees'),
    ('line_manager', 'team',       'approve:team_leaves'),
    ('line_manager', 'team',       'view:team_burnout'),

    ('employee',     'self',       'view:self'),
    ('employee',     'self',       'update:self_profile'),
    ('employee',     'self',       'submit:surveys'),

    ('candidate',    'self',       'take:assessment'),
    ('candidate',    'self',       'view:own_results')
) AS seed(role_name, res, act)
  ON r.name = seed.role_name AND r.tenant_id IS NULL
ON CONFLICT DO NOTHING;
