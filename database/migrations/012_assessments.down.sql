-- =============================================================================
-- 012_assessments.down.sql
-- =============================================================================
DROP TABLE IF EXISTS app.assessment_scores CASCADE;
DROP TABLE IF EXISTS app.assessment_responses CASCADE;
DROP TABLE IF EXISTS app.assessment_sessions CASCADE;
DROP TRIGGER IF EXISTS trg_assessments_updated_at ON app.assessments;
DROP TABLE IF EXISTS app.assessments CASCADE;
