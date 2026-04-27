-- 052_consent_history.down.sql
BEGIN;

DROP TRIGGER IF EXISTS trg_data_consents_history_update ON app.data_consents;
DROP TRIGGER IF EXISTS trg_data_consents_history_insert ON app.data_consents;
DROP FUNCTION IF EXISTS app.data_consents_write_history();

DROP TRIGGER IF EXISTS trg_consent_history_no_delete ON app.consent_history;
DROP TRIGGER IF EXISTS trg_consent_history_no_update ON app.consent_history;
DROP POLICY IF EXISTS consent_history_tenant_iso ON app.consent_history;
DROP INDEX IF EXISTS app.idx_consent_history_consent;
DROP INDEX IF EXISTS app.idx_consent_history_user_type;
DROP TABLE IF EXISTS app.consent_history;

COMMIT;
