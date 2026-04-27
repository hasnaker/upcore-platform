-- 037_employee_avatar.down.sql
ALTER TABLE app.employees
    DROP COLUMN IF EXISTS avatar_url,
    DROP COLUMN IF EXISTS avatar_updated_at;
