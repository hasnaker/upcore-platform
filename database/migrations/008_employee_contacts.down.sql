-- =============================================================================
-- 008_employee_contacts.down.sql
-- =============================================================================
DROP TRIGGER IF EXISTS trg_employee_dependents_updated_at ON app.employee_dependents;
DROP TABLE IF EXISTS app.employee_dependents CASCADE;
DROP TRIGGER IF EXISTS trg_employee_contacts_updated_at ON app.employee_contacts;
DROP TABLE IF EXISTS app.employee_contacts CASCADE;
