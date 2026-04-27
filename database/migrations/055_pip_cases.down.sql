-- =============================================================================
-- 055_pip_cases.down.sql
-- Revert 055_pip_cases.up.sql — idempotent rollback.
-- =============================================================================

SET search_path TO app, public;

-- Retention policy
DELETE FROM app.retention_policies WHERE name = 'pip_cases_closed_10y';

-- Audit triggers
DROP TRIGGER IF EXISTS trg_audit_change         ON app.pip_outcome;
DROP TRIGGER IF EXISTS trg_audit_change         ON app.pip_checkins;
DROP TRIGGER IF EXISTS trg_audit_change         ON app.pip_cases;
DROP TRIGGER IF EXISTS trg_pip_cases_updated_at ON app.pip_cases;

-- RLS policies
DROP POLICY IF EXISTS pip_outcome_rls  ON app.pip_outcome;
DROP POLICY IF EXISTS pip_checkins_rls ON app.pip_checkins;
DROP POLICY IF EXISTS pip_goals_rls    ON app.pip_goals;
DROP POLICY IF EXISTS pip_cases_rls    ON app.pip_cases;

-- Tables (CASCADE to drop FK-dependents)
DROP TABLE IF EXISTS app.pip_outcome  CASCADE;
DROP TABLE IF EXISTS app.pip_checkins CASCADE;
DROP TABLE IF EXISTS app.pip_goals    CASCADE;
DROP TABLE IF EXISTS app.pip_cases    CASCADE;
