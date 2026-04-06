-- 001_users.down.sql
DROP POLICY IF EXISTS users_tenant_isolation ON users;
DROP INDEX IF EXISTS ux_users_tenant_email_lower;
DROP INDEX IF EXISTS idx_users_tenant_status;
DROP INDEX IF EXISTS idx_users_tenant_email;
DROP INDEX IF EXISTS idx_users_clerk_id;
DROP TABLE IF EXISTS users;
