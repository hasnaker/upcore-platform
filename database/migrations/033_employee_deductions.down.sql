-- 033_employee_deductions.down.sql
DROP INDEX IF EXISTS app.idx_employee_deductions_period;
DROP INDEX IF EXISTS app.idx_employee_deductions_active;
DROP TABLE IF EXISTS app.employee_deductions;
