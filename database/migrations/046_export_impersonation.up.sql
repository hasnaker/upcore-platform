-- 046_export_impersonation.up.sql
-- Full tenant export job + admin impersonation audit trail.

-- Tenant export: KVKK 11 (veri taşınabilirliği) kapsamında full zip dump.
CREATE TABLE IF NOT EXISTS app.tenant_export_jobs (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         uuid NOT NULL,
    requested_by      uuid NOT NULL,
    scope             varchar(40) NOT NULL DEFAULT 'full',
        -- full|employees_only|payroll_only|kvkk_subject
    kvkk_subject_id   uuid,  -- "sadece bir kişinin verisi" için (KVKK 11)
    format            varchar(20) NOT NULL DEFAULT 'zip',  -- zip|ndjson
    status            varchar(20) NOT NULL DEFAULT 'queued'
        CHECK (status IN ('queued','running','completed','failed','expired')),
    output_blob_url   text,
    output_size_bytes bigint,
    expires_at        timestamptz,  -- download link expiry (7 gün default)
    started_at        timestamptz,
    completed_at      timestamptz,
    error_message     text,
    created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_export_jobs_tenant
    ON app.tenant_export_jobs (tenant_id, created_at DESC);

ALTER TABLE app.tenant_export_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_export_jobs_rls ON app.tenant_export_jobs
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

-- Admin impersonation (support için): operatörün geçici olarak tenant
-- içine "employee X olarak" girmesi. Her saniye audit edilir.
CREATE TABLE IF NOT EXISTS app.admin_impersonation_sessions (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id     uuid NOT NULL,     -- UpCore personeli (CS team)
    target_tenant_id  uuid NOT NULL,
    target_user_id    uuid NOT NULL,     -- impersonate edilen kullanıcı
    reason            text NOT NULL,     -- zorunlu — support ticket ID vs
    started_at        timestamptz NOT NULL DEFAULT now(),
    ended_at          timestamptz,
    max_duration_min  integer NOT NULL DEFAULT 60,
    ip_address        inet,
    user_agent        text
);

CREATE INDEX IF NOT EXISTS idx_impersonation_admin
    ON app.admin_impersonation_sessions (admin_user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_impersonation_tenant
    ON app.admin_impersonation_sessions (target_tenant_id, started_at DESC);

COMMENT ON TABLE app.tenant_export_jobs IS 'KVKK 11 veri taşınabilirlik — full zip export; 7 gün download URL geçerli';
COMMENT ON TABLE app.admin_impersonation_sessions IS 'Destek ekibi impersonation — audit trail + max 1 saat + zorunlu reason';
