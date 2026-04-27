-- 037_employee_avatar.up.sql
-- Çalışan profil fotoğrafı URL'i (Azure Blob link). Max 2MB, resim tipi.
ALTER TABLE app.employees
    ADD COLUMN IF NOT EXISTS avatar_url text,
    ADD COLUMN IF NOT EXISTS avatar_updated_at timestamptz;
