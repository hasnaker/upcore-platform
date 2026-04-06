-- =============================================================================
-- 003_users.down.sql
-- =============================================================================
DROP TRIGGER IF EXISTS trg_users_updated_at ON app.users;
DROP TABLE IF EXISTS app.users CASCADE;
