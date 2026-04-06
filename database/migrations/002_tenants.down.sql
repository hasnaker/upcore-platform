-- =============================================================================
-- 002_tenants.down.sql
-- =============================================================================
DROP TRIGGER IF EXISTS trg_tenants_updated_at ON app.tenants;
DROP TABLE IF EXISTS app.tenants CASCADE;
