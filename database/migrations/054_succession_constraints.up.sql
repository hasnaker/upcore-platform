-- =============================================================================
-- 054_succession_constraints.up.sql
-- Succession pool hardening:
--   1) Max 3 distinct plans per candidate (DB-enforced).
--   2) Audit triggers on plans + candidates for immutable trail.
--   3) Timestamp trigger hardening (already present but keep idempotent).
-- =============================================================================

SET search_path TO app, public;

-- ---- Enforce: a candidate can appear in at most 3 distinct succession plans -
CREATE OR REPLACE FUNCTION app.check_succession_pool_cap()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_count INT;
BEGIN
    SELECT COUNT(DISTINCT plan_id) INTO v_count
      FROM app.succession_candidates
     WHERE candidate_employee_id = NEW.candidate_employee_id
       AND (TG_OP = 'INSERT' OR id <> NEW.id);

    IF v_count >= 3 THEN
        RAISE EXCEPTION 'aday % zaten 3 farklı havuzda — max 3 havuz/aday kuralı', NEW.candidate_employee_id
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_succession_pool_cap ON app.succession_candidates;
CREATE TRIGGER trg_succession_pool_cap
    BEFORE INSERT OR UPDATE OF candidate_employee_id, plan_id
    ON app.succession_candidates
    FOR EACH ROW EXECUTE FUNCTION app.check_succession_pool_cap();

-- ---- Attach generic audit trigger to succession_plans + succession_candidates
--      Function defined in 019_audit_events.up.sql (audit.log_row_change).
DROP TRIGGER IF EXISTS trg_audit_change ON app.succession_plans;
CREATE TRIGGER trg_audit_change
    AFTER INSERT OR UPDATE OR DELETE ON app.succession_plans
    FOR EACH ROW EXECUTE FUNCTION audit.log_row_change();

DROP TRIGGER IF EXISTS trg_audit_change ON app.succession_candidates;
CREATE TRIGGER trg_audit_change
    AFTER INSERT OR UPDATE OR DELETE ON app.succession_candidates
    FOR EACH ROW EXECUTE FUNCTION audit.log_row_change();

COMMENT ON FUNCTION app.check_succession_pool_cap() IS
    'Enforces: aynı aday en fazla 3 farklı succession_plans.id içinde yer alabilir.';
