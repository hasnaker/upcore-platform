-- =============================================================================
-- 063_optimistic_locking_support.down.sql
-- 063 rollback: audit/trigger/yardımcı obje geri alınır. version kolonları
-- ve 062'de eklenen güvenlik objeleri KORUNUR (downgrade yalnızca 063
-- tarafından eklenen ek gözlemleme araçlarını kaldırır).
-- =============================================================================

BEGIN;

SET search_path TO app, public;

DROP TRIGGER IF EXISTS trg_ml_objection_outcome_history ON app.ml_objections;
DROP FUNCTION IF EXISTS app.log_ml_objection_outcome();
DROP TABLE IF EXISTS app.ml_objection_outcome_history;

DROP TABLE IF EXISTS app.optimistic_lock_conflicts;

DROP INDEX IF EXISTS app.idx_ml_predictions_active;

COMMIT;
