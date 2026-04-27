-- =============================================================================
-- 062_security_hardening.up.sql
-- P0 güvenlik sertleştirme paketi (satış öncesi).
--
-- Kapsam:
--   1) app.current_tenant_id() → oturum GUC set edilmemişse RAISE EXCEPTION
--      (önceki davranış: zero-UUID fallback = sessiz RLS bypass).
--   2) Kritik tablolara `version INT NOT NULL DEFAULT 1` eklenir:
--      succession_candidates, okrs, okr_key_results, intervention_assignments,
--      pip_cases, performance_reviews, internal_rotations.
--      Optimistic locking (compare-and-set) güncellemelerde kayıp yazımları
--      engeller.
--   3) ml_objections tablosuna DPO onay + retract akışı için kolonlar:
--      resolution_outcome (upheld|dismissed), dpo_user_id, dpo_signed_at,
--      prediction_retracted_at, reviewer_ip, reviewer_ua.
--   4) ml_predictions_audit tablosuna retract alanları:
--      retracted_at, retracted_by, retraction_reason.
--   5) Rate limit observability: rate_limit_degraded_events tablosu.
-- =============================================================================

BEGIN;

SET search_path TO app, public;

-- -----------------------------------------------------------------------------
-- 1) current_tenant_id() — fail loud, ASLA zero-UUID'ye düşme
-- -----------------------------------------------------------------------------
-- Rationale: HTTP middleware set_config('app.tenant_id', ...) çağırmadığında
-- repository'ler tüm tenant'ların verisini okurdu. Artık eksik GUC →
-- exception → 500 → üst katmanda yakalanır. Defense-in-depth.
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
        RAISE EXCEPTION 'app.tenant_id GUC not set — refusing to bypass RLS'
            USING ERRCODE = '28000', -- invalid_authorization_specification
                  HINT    = 'Caller must SET LOCAL app.tenant_id = <uuid> at transaction start (see middleware/rlsctx).';
    END IF;
    RETURN v_tid::uuid;
END$$;

COMMENT ON FUNCTION app.current_tenant_id() IS
    'Returns tenant UUID from session GUC app.tenant_id. RAISES when unset '
    '(prevents silent RLS bypass). Set via rlsctx middleware on each request.';

-- -----------------------------------------------------------------------------
-- 2) Optimistic locking — version columns
-- -----------------------------------------------------------------------------
-- Pattern: UPDATE ... SET ..., version = version + 1
--           WHERE id = $1 AND version = $2
-- 0 rows affected → ErrVersionConflict (HTTP 409). Retryable by caller.

-- succession_candidates: iki manager aynı slot onaylar → son yazan kaybedebilir
ALTER TABLE app.succession_candidates
    ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;
COMMENT ON COLUMN app.succession_candidates.version IS
    'Optimistic lock. Bump on every update; caller passes expected value in WHERE.';

-- okrs + okr_key_results: paralel check-in → lost update
ALTER TABLE app.okrs
    ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;
ALTER TABLE app.okr_key_results
    ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;

-- intervention_assignments: İK + manager çakışma
ALTER TABLE app.intervention_assignments
    ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;

-- pip_cases: legal review + manager update çakışma
ALTER TABLE app.pip_cases
    ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;

-- performance_reviews: reviewer + calibration çakışma
ALTER TABLE app.performance_reviews
    ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;

-- internal_rotations: mobilite manager + employee çakışma
ALTER TABLE app.internal_rotations
    ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;

-- -----------------------------------------------------------------------------
-- 3) ML objections — DPO + retract workflow
-- -----------------------------------------------------------------------------
-- Yeni statü: resolution_outcome ∈ (upheld | dismissed | under_review)
-- upheld  → tahmin retract, downstream müdahale kaldırılır
-- dismissed → gerekçe + DPO sign-off zorunlu
-- under_review → 30 gün SLA beklemede

ALTER TABLE app.ml_objections
    ADD COLUMN IF NOT EXISTS resolution_outcome      VARCHAR(20)
        CHECK (resolution_outcome IN ('upheld','dismissed','under_review') OR resolution_outcome IS NULL),
    ADD COLUMN IF NOT EXISTS dpo_user_id             uuid REFERENCES app.employees(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS dpo_signed_at           timestamptz,
    ADD COLUMN IF NOT EXISTS prediction_retracted_at timestamptz,
    ADD COLUMN IF NOT EXISTS reviewer_ip             inet,
    ADD COLUMN IF NOT EXISTS reviewer_ua             text;

COMMENT ON COLUMN app.ml_objections.resolution_outcome IS
    'KVKK Madde 22: upheld=tahmin iptal, dismissed=itiraz reddedildi (DPO onayı zorunlu), under_review=incelemede.';
COMMENT ON COLUMN app.ml_objections.dpo_user_id IS
    'Data Protection Officer sign-off. NULL kalamaz dismissed outcome için.';

-- Integrity: dismissed outcome → dpo_user_id + dpo_signed_at zorunlu
CREATE OR REPLACE FUNCTION app.validate_ml_objection_dpo()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.resolution_outcome = 'dismissed' THEN
        IF NEW.dpo_user_id IS NULL OR NEW.dpo_signed_at IS NULL THEN
            RAISE EXCEPTION 'dismissed outcome requires DPO sign-off (dpo_user_id + dpo_signed_at)'
                USING ERRCODE = 'check_violation';
        END IF;
    END IF;
    IF NEW.resolution_outcome = 'upheld' THEN
        IF NEW.prediction_retracted_at IS NULL THEN
            RAISE EXCEPTION 'upheld outcome requires prediction_retracted_at to be set'
                USING ERRCODE = 'check_violation';
        END IF;
    END IF;
    RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_ml_objections_dpo ON app.ml_objections;
CREATE TRIGGER trg_ml_objections_dpo
    BEFORE INSERT OR UPDATE OF resolution_outcome, dpo_user_id, dpo_signed_at, prediction_retracted_at
    ON app.ml_objections
    FOR EACH ROW EXECUTE FUNCTION app.validate_ml_objection_dpo();

CREATE INDEX IF NOT EXISTS idx_ml_objections_outcome
    ON app.ml_objections (tenant_id, resolution_outcome)
    WHERE resolution_outcome IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 4) ml_predictions_audit — retract path (objection upheld kayıt zinciri)
-- -----------------------------------------------------------------------------
ALTER TABLE app.ml_predictions_audit
    ADD COLUMN IF NOT EXISTS retracted_at       timestamptz,
    ADD COLUMN IF NOT EXISTS retracted_by       uuid REFERENCES app.employees(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS retraction_reason  text,
    ADD COLUMN IF NOT EXISTS retraction_objection_id uuid REFERENCES app.ml_objections(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ml_predictions_retracted
    ON app.ml_predictions_audit (tenant_id, retracted_at)
    WHERE retracted_at IS NOT NULL;

COMMENT ON COLUMN app.ml_predictions_audit.retracted_at IS
    'Tahmin, kullanıcı itirazı üzerine geri alındı. Downstream servisler ml.prediction.retracted.v1 event dinler.';

-- -----------------------------------------------------------------------------
-- 5) Rate limit degradation audit (Prometheus eksik olduğunda bile)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app.rate_limit_degradations (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name   varchar(80)  NOT NULL,
    instance_id    varchar(120) NOT NULL,
    mode           varchar(32)  NOT NULL,
    event_type     varchar(32)  NOT NULL
                   CHECK (event_type IN ('breaker_open','breaker_close','redis_down','local_fallback')),
    detail         text,
    occurred_at    timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_degradations_time
    ON app.rate_limit_degradations (occurred_at DESC);

COMMENT ON TABLE app.rate_limit_degradations IS
    'Rate limiter fail-closed tetiklendiğinde kayıt. Metrics + alerting için yedek.';

COMMIT;
