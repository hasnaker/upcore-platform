-- =============================================================================
-- 016_interventions.down.sql
-- =============================================================================
DROP TABLE IF EXISTS ml.effectiveness_posteriors CASCADE;
DROP TRIGGER IF EXISTS trg_int_outcomes_updated_at ON app.intervention_outcomes;
DROP TABLE IF EXISTS app.intervention_outcomes CASCADE;
DROP TRIGGER IF EXISTS trg_int_assignments_updated_at ON app.intervention_assignments;
DROP TABLE IF EXISTS app.intervention_assignments CASCADE;
DROP TRIGGER IF EXISTS trg_interventions_updated_at ON app.interventions;
DROP TABLE IF EXISTS app.interventions CASCADE;
