-- =============================================================================
-- 062_security_hardening.down.sql
-- Revert 062_security_hardening.up.sql
-- =============================================================================

BEGIN;

SET search_path TO app, public;

-- Revert current_tenant_id() to the legacy zero-UUID fallback (NOT recommended,
-- but required for clean downgrade to pre-062 behaviour).
CREATE OR REPLACE FUNCTION app.current_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_tid text;
BEGIN
    v_tid := current_setting('app.tenant_id', true);
    IF v_tid IS NULL OR v_tid = '' THEN
        RETURN '00000000-0000-0000-0000-000000000000'::uuid;
    END IF;
    RETURN v_tid::uuid;
END$$;

-- Drop ml_objection DPO trigger + columns
DROP TRIGGER IF EXISTS trg_ml_objections_dpo ON app.ml_objections;
DROP FUNCTION IF EXISTS app.validate_ml_objection_dpo();
ALTER TABLE app.ml_objections
    DROP COLUMN IF EXISTS resolution_outcome,
    DROP COLUMN IF EXISTS dpo_user_id,
    DROP COLUMN IF EXISTS dpo_signed_at,
    DROP COLUMN IF EXISTS prediction_retracted_at,
    DROP COLUMN IF EXISTS reviewer_ip,
    DROP COLUMN IF EXISTS reviewer_ua;

-- Drop ml_predictions_audit retract columns
DROP INDEX IF EXISTS app.idx_ml_predictions_retracted;
ALTER TABLE app.ml_predictions_audit
    DROP COLUMN IF EXISTS retracted_at,
    DROP COLUMN IF EXISTS retracted_by,
    DROP COLUMN IF EXISTS retraction_reason,
    DROP COLUMN IF EXISTS retraction_objection_id;

-- Drop version columns
ALTER TABLE app.succession_candidates     DROP COLUMN IF EXISTS version;
ALTER TABLE app.okrs                      DROP COLUMN IF EXISTS version;
ALTER TABLE app.okr_key_results           DROP COLUMN IF EXISTS version;
ALTER TABLE app.intervention_assignments  DROP COLUMN IF EXISTS version;
ALTER TABLE app.pip_cases                 DROP COLUMN IF EXISTS version;
ALTER TABLE app.performance_reviews       DROP COLUMN IF EXISTS version;
ALTER TABLE app.internal_rotations        DROP COLUMN IF EXISTS version;

-- Drop rate limit audit
DROP TABLE IF EXISTS app.rate_limit_degradations;

COMMIT;
