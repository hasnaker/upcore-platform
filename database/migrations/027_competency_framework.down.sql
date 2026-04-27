-- 027_competency_framework.down.sql
SET search_path TO app, public;

DROP TRIGGER IF EXISTS trg_competencies_updated_at ON app.competencies;
DROP TABLE IF EXISTS app.competencies CASCADE;
