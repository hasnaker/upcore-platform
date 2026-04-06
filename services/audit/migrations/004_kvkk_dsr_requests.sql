-- 004_kvkk_dsr_requests.sql
-- KVKK data subject rights requests (11. madde).

CREATE TABLE IF NOT EXISTS kvkk_dsr_requests (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID        NOT NULL,
    data_subject_email  TEXT        NOT NULL,
    request_type        TEXT        NOT NULL
        CHECK (request_type IN (
            'access','rectification','erasure',
            'restriction','portability','objection'
        )),
    status              TEXT        NOT NULL DEFAULT 'received'
        CHECK (status IN (
            'received','verifying','in_progress',
            'completed','rejected'
        )),
    received_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verified_at         TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    rejection_reason    TEXT,
    response_data_url   TEXT,
    handled_by          UUID,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dsr_tenant_status
    ON kvkk_dsr_requests (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_dsr_email
    ON kvkk_dsr_requests (tenant_id, data_subject_email);
CREATE INDEX IF NOT EXISTS idx_dsr_overdue
    ON kvkk_dsr_requests (received_at)
    WHERE status NOT IN ('completed','rejected');

COMMENT ON TABLE kvkk_dsr_requests IS 'KVKK 11. madde data subject rights requests (30-day SLA)';
