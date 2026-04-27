-- =============================================================================
-- 026_sgk_workplace.down.sql
-- =============================================================================

SET search_path TO app, public;

DROP TRIGGER IF EXISTS trg_tenant_sgk_workplaces_updated_at ON app.tenant_sgk_workplaces;
DROP TABLE IF EXISTS app.tenant_sgk_workplaces CASCADE;

ALTER TABLE app.employees
    DROP COLUMN IF EXISTS sgk_ise_giris_tarihi,
    DROP COLUMN IF EXISTS baba_adi,
    DROP COLUMN IF EXISTS meslek_kodu;
