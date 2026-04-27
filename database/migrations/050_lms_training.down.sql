-- 050_lms_training.down.sql — rollback migration 050.

BEGIN;

DROP POLICY IF EXISTS skill_matrix_tenant_iso ON app.skill_matrix;
DROP POLICY IF EXISTS training_certificates_tenant_iso ON app.training_certificates;
DROP POLICY IF EXISTS training_enrollments_tenant_iso ON app.training_enrollments;
DROP POLICY IF EXISTS training_programs_tenant_iso ON app.training_programs;

DROP TABLE IF EXISTS app.skill_matrix;
DROP TABLE IF EXISTS app.training_certificates;
DROP TABLE IF EXISTS app.training_enrollments;
DROP TABLE IF EXISTS app.training_programs;

COMMIT;
