-- =============================================================================
-- 053_intervention_consent_log.down.sql
-- =============================================================================

BEGIN;

DROP TRIGGER IF EXISTS trg_intervention_consent_log_no_update ON app.intervention_consent_log;
DROP TRIGGER IF EXISTS trg_intervention_consent_log_no_delete ON app.intervention_consent_log;
DROP POLICY IF EXISTS intervention_consent_log_tenant_iso ON app.intervention_consent_log;
DROP INDEX IF EXISTS app.idx_int_consent_log_assignment;
DROP INDEX IF EXISTS app.idx_int_consent_log_employee;
DROP TABLE IF EXISTS app.intervention_consent_log;

COMMIT;
