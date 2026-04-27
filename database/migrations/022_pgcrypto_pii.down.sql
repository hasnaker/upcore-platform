-- Rollback: pgcrypto PII encryption + retention policies
DROP FUNCTION IF EXISTS app.run_retention_policy(text) CASCADE;
DROP TABLE IF EXISTS app.retention_policies CASCADE;
DROP FUNCTION IF EXISTS app.decrypt_tckn(bytea) CASCADE;
DROP FUNCTION IF EXISTS app.encrypt_tckn(text) CASCADE;
DROP INDEX IF EXISTS idx_employees_tckn_last_four;
ALTER TABLE app.employees
    DROP COLUMN IF EXISTS tckn_enc,
    DROP COLUMN IF EXISTS tckn_last_four;
