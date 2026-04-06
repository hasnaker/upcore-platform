-- 005_audit_exports.sql
-- Audit log export requests.

CREATE TABLE IF NOT EXISTS audit_exports (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID        NOT NULL,
    requested_by    UUID        NOT NULL,
    format          TEXT        NOT NULL
        CHECK (format IN ('csv','ndjson','json')),
    filter          JSONB       NOT NULL DEFAULT '{}',
    status          TEXT        NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','processing','completed','failed')),
    row_count       INT         NOT NULL DEFAULT 0,
    file_url        TEXT,
    requested_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_exports_tenant
    ON audit_exports (tenant_id, requested_at DESC);

COMMENT ON TABLE audit_exports IS 'Audit log export jobs (CSV/NDJSON/JSON)';
