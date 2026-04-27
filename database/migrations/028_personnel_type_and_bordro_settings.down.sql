SET search_path TO app, public;

DROP TRIGGER IF EXISTS trg_tenant_bordro_settings_updated_at ON app.tenant_bordro_settings;
DROP TABLE IF EXISTS app.tenant_bordro_settings CASCADE;

DROP INDEX IF EXISTS app.idx_employees_tenant_personnel_type;

ALTER TABLE app.employees
    DROP COLUMN IF EXISTS ek_gosterge,
    DROP COLUMN IF EXISTS gosterge,
    DROP COLUMN IF EXISTS hizmet_puani,
    DROP COLUMN IF EXISTS hizmet_sinifi,
    DROP COLUMN IF EXISTS kademe,
    DROP COLUMN IF EXISTS kadro_derece,
    DROP COLUMN IF EXISTS kadro_unvani,
    DROP COLUMN IF EXISTS personnel_type;
