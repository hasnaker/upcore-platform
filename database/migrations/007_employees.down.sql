-- =============================================================================
-- 007_employees.down.sql
-- =============================================================================
DROP TABLE IF EXISTS app.employment_history CASCADE;
DROP TRIGGER IF EXISTS trg_employees_tenure_months ON app.employees;
DROP TRIGGER IF EXISTS trg_employees_updated_at ON app.employees;
DROP FUNCTION IF EXISTS app.calc_employee_tenure_months();
DROP TABLE IF EXISTS app.employees CASCADE;
