-- =============================================================================
-- 008_ml_objections.sql (audit service local migration)
-- KVKK Madde 22 itiraz kuyruğu — bkz. database/migrations/056 (kanonik).
-- Bu dosya audit servisin kendi migration runner'ı için duplicate tanımdır;
-- gerçek canonical şema upcore-platform/database/migrations/056_ml_predictions_audit.up.sql
-- dosyasındadır. Audit servis CI'da erişebilmek için sadece ml_objections tablosunu
-- tekrar tanımlıyor (RLS + trigger dahil). Aynı tablo app schema'da
-- CREATE TABLE IF NOT EXISTS ile idempotent kalır.
-- =============================================================================

CREATE TABLE IF NOT EXISTS app.ml_objections (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         uuid NOT NULL,
    user_id           uuid NOT NULL,
    prediction_id     uuid NOT NULL,
    reason            text NOT NULL,
    contact_email     varchar(320),
    status            varchar(20) NOT NULL DEFAULT 'received',
    rejection_reason  text,
    resolution_note   text,
    reviewer_user_id  uuid,
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
