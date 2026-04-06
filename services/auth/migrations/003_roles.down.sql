-- 003_roles.down.sql
DROP POLICY IF EXISTS rbac_policies_tenant_isolation ON rbac_policies;
DROP INDEX IF EXISTS idx_rbac_policies_lookup;
DROP INDEX IF EXISTS idx_rbac_policies_role;
DROP TABLE IF EXISTS rbac_policies;

DROP POLICY IF EXISTS user_roles_tenant_isolation ON user_roles;
DROP INDEX IF EXISTS idx_user_roles_role;
DROP INDEX IF EXISTS idx_user_roles_tenant;
DROP TABLE IF EXISTS user_roles;

DROP POLICY IF EXISTS roles_tenant_isolation ON roles;
DROP INDEX IF EXISTS idx_roles_tenant;
DROP INDEX IF EXISTS ux_roles_scope_name;
DROP TABLE IF EXISTS roles;
