-- Rollback 066_one_on_one_meetings
SET search_path TO app, public;

DROP TABLE IF EXISTS app.one_on_one_notes    CASCADE;
DROP TABLE IF EXISTS app.one_on_one_meetings CASCADE;
