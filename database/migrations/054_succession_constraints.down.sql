-- =============================================================================
-- 054_succession_constraints.down.sql — rollback
-- =============================================================================

SET search_path TO app, public;

DROP TRIGGER IF EXISTS trg_succession_pool_cap ON app.succession_candidates;
DROP FUNCTION IF EXISTS app.check_succession_pool_cap();

DROP TRIGGER IF EXISTS trg_audit_change ON app.succession_plans;
DROP TRIGGER IF EXISTS trg_audit_change ON app.succession_candidates;
