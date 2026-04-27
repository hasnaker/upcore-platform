-- 041_survey_branching.down.sql
DROP TABLE IF EXISTS app.survey_response_sentiment;
ALTER TABLE app.survey_questions DROP COLUMN IF EXISTS branching_rules;
