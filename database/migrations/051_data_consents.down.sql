-- 051_data_consents.down.sql
BEGIN;

DROP TRIGGER IF EXISTS trg_data_consents_updated_at ON app.data_consents;
DROP POLICY IF EXISTS data_consents_tenant_iso ON app.data_consents;
DROP INDEX IF EXISTS app.idx_data_consents_status;
DROP INDEX IF EXISTS app.idx_data_consents_lookup;
DROP INDEX IF EXISTS app.idx_data_consents_tenant_user;
DROP TABLE IF EXISTS app.data_consents;

COMMIT;
