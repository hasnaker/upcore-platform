-- =============================================================================
-- 004_roles_permissions.down.sql
-- =============================================================================
DROP TRIGGER IF EXISTS trg_user_role_assignments_updated_at ON app.user_role_assignments;
DROP TRIGGER IF EXISTS trg_roles_updated_at ON app.roles;
DROP TABLE IF EXISTS app.user_role_assignments CASCADE;
DROP TABLE IF EXISTS app.role_permissions CASCADE;
DROP TABLE IF EXISTS app.permissions CASCADE;
DROP TABLE IF EXISTS app.roles CASCADE;
