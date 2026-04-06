-- =============================================================================
-- 005_departments.down.sql
-- =============================================================================
DROP TRIGGER IF EXISTS trg_departments_updated_at ON app.departments;
DROP TABLE IF EXISTS app.departments CASCADE;
