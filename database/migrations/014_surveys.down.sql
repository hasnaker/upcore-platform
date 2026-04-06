-- =============================================================================
-- 014_surveys.down.sql
-- =============================================================================
DROP TABLE IF EXISTS app.survey_responses CASCADE;
DROP TRIGGER IF EXISTS trg_survey_invitations_updated_at ON app.survey_invitations;
DROP TABLE IF EXISTS app.survey_invitations CASCADE;
DROP TRIGGER IF EXISTS trg_surveys_updated_at ON app.surveys;
DROP TABLE IF EXISTS app.surveys CASCADE;
