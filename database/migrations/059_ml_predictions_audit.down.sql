-- Down migration for 056_ml_predictions_audit
BEGIN;

DROP TRIGGER IF EXISTS trg_ml_objections_updated_at ON app.ml_objections;
DROP TABLE IF EXISTS app.ml_objections CASCADE;

DROP TRIGGER IF EXISTS trg_ml_predictions_audit_updated_at ON app.ml_predictions_audit;
DROP TABLE IF EXISTS app.ml_predictions_audit CASCADE;

COMMIT;
