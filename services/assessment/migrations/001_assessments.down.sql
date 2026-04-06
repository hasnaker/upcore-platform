-- 001_assessments.down.sql
DROP POLICY IF EXISTS assessments_tenant_isolation ON app.assessments;
DROP TABLE IF EXISTS app.assessments;
