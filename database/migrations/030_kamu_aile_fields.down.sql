-- 030_kamu_aile_fields.down.sql
ALTER TABLE app.employees
    DROP COLUMN IF EXISTS es_calisiyor_mu,
    DROP COLUMN IF EXISTS cocuk_06,
    DROP COLUMN IF EXISTS cocuk_6plus,
    DROP COLUMN IF EXISTS engelli_indirimi_aylik,
    DROP COLUMN IF EXISTS medeni_hal;
