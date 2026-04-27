-- =============================================================================
-- 056_ml_predictions_audit.up.sql
-- upc-ml-validation §7 — KVKK Madde 22 + Madde 11 uyum tablosu.
--
-- Her ML tahmin ve her itiraz bu tabloya yazılır. Append-only değil
-- (çünkü outcome_actual geriye dönük doldurulur), ama objected_at ve
-- reviewed_at trigger'ı immutable_once_set korur.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- ml_predictions_audit — her tahmin için tam audit kaydı
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app.ml_predictions_audit (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id             uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    user_id               uuid NOT NULL REFERENCES app.employees(id) ON DELETE CASCADE,
    model_version         varchar(80)  NOT NULL,
    prediction_value      numeric(5,4) NOT NULL CHECK (prediction_value BETWEEN 0 AND 1),
    horizon_days          integer      NOT NULL CHECK (horizon_days IN (30, 60, 90)),
    consent_status        varchar(20)  NOT NULL
                          CHECK (consent_status IN ('granted','declined','revoked','unknown')),
    shown_to_user         boolean      NOT NULL DEFAULT true,
    shap_json             jsonb,
    outcome_actual        integer      CHECK (outcome_actual IN (0, 1)),
    outcome_observed_at   timestamptz,
    objected_at           timestamptz,
    reviewed_at           timestamptz,
    review_outcome        varchar(40)
                          CHECK (review_outcome IN ('upheld','overturned','partial','pending') OR review_outcome IS NULL),
    reviewer_user_id      uuid REFERENCES app.employees(id) ON DELETE SET NULL,
    predicted_at          timestamptz  NOT NULL DEFAULT now(),
    created_at            timestamptz  NOT NULL DEFAULT now(),
    updated_at            timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ml_audit_tenant_user_time
    ON app.ml_predictions_audit (tenant_id, user_id, predicted_at DESC);

CREATE INDEX IF NOT EXISTS idx_ml_audit_model_version
    ON app.ml_predictions_audit (model_version, predicted_at DESC);

CREATE INDEX IF NOT EXISTS idx_ml_audit_outcome_join
    ON app.ml_predictions_audit (model_version, predicted_at)
    WHERE outcome_actual IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ml_audit_objected
    ON app.ml_predictions_audit (tenant_id, objected_at)
    WHERE objected_at IS NOT NULL;

ALTER TABLE app.ml_predictions_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ml_predictions_audit_tenant_iso ON app.ml_predictions_audit;
CREATE POLICY ml_predictions_audit_tenant_iso ON app.ml_predictions_audit
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE TRIGGER trg_ml_predictions_audit_updated_at
    BEFORE UPDATE ON app.ml_predictions_audit
    FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

COMMENT ON TABLE app.ml_predictions_audit IS
    'upc-ml-validation §7 — her ML tahmin + SHAP + rıza durumu + KVKK Madde 22 itiraz takibi. Her tahmin satır = bir audit kanıtı.';

-- -----------------------------------------------------------------------------
-- ml_objections — manual review kuyruğu
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app.ml_objections (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    user_id           uuid NOT NULL REFERENCES app.employees(id) ON DELETE CASCADE,
    prediction_id     uuid NOT NULL REFERENCES app.ml_predictions_audit(id) ON DELETE CASCADE,
    reason            text NOT NULL,
    contact_email     varchar(320),
    status            varchar(20) NOT NULL DEFAULT 'received'
                      CHECK (status IN ('received','verifying','in_progress','completed','rejected')),
    rejection_reason  text,
    resolution_note   text,
    reviewer_user_id  uuid REFERENCES app.employees(id) ON DELETE SET NULL,
    objected_at       timestamptz NOT NULL DEFAULT now(),
    reviewed_at       timestamptz,
    completed_at      timestamptz,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ml_objections_queue
    ON app.ml_objections (tenant_id, status, objected_at);

CREATE INDEX IF NOT EXISTS idx_ml_objections_user
    ON app.ml_objections (tenant_id, user_id, objected_at DESC);

ALTER TABLE app.ml_objections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ml_objections_tenant_iso ON app.ml_objections;
CREATE POLICY ml_objections_tenant_iso ON app.ml_objections
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE TRIGGER trg_ml_objections_updated_at
    BEFORE UPDATE ON app.ml_objections
    FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

COMMENT ON TABLE app.ml_objections IS
    'KVKK Madde 22 itiraz kuyruğu — DSR benzeri akış: received → verifying → in_progress → completed/rejected. 30 gün SLA.';

COMMIT;
