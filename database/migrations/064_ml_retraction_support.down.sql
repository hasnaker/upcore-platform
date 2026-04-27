-- =============================================================================
-- 064_ml_retraction_support.down.sql
-- Revert 064. Kolon ve yardımcı indeksler kaldırılır. Verileri bozan düşme
-- yoktur — recommendation_active kolonu DEFAULT true idi, drop zararsız.
-- =============================================================================

BEGIN;

SET search_path TO app, public;

DROP FUNCTION IF EXISTS app.prune_optimistic_lock_conflicts(interval);

DROP INDEX IF EXISTS app.idx_ml_predictions_audit_retraction_objection;

ALTER TABLE app.intervention_assignments
    DROP COLUMN IF EXISTS recommendation_active;

DROP INDEX IF EXISTS app.idx_intervention_assignments_source_prediction;

COMMIT;
