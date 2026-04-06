-- 002_notifications.sql
-- Outbound notification records, partitioned by month.

CREATE TABLE IF NOT EXISTS notifications (
    id             UUID        NOT NULL,
    tenant_id      UUID        NOT NULL,
    user_id        UUID,
    employee_id    UUID,
    channel        TEXT        NOT NULL CHECK (channel IN ('email','sms','push','in_app','slack','teams','webhook')),
    template_key   TEXT,
    subject        TEXT,
    body           TEXT,
    payload        JSONB       NOT NULL DEFAULT '{}',
    priority       TEXT        NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
    status         TEXT        NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','queued','sending','sent','delivered','failed','bounced','read')),
    scheduled_at   TIMESTAMPTZ,
    sent_at        TIMESTAMPTZ,
    delivered_at   TIMESTAMPTZ,
    read_at        TIMESTAMPTZ,
    failed_at      TIMESTAMPTZ,
    error_message  TEXT,
    retry_count    INT         NOT NULL DEFAULT 0,
    provider_ref   TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE INDEX IF NOT EXISTS idx_notif_tenant_user
    ON notifications (tenant_id, user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_status
    ON notifications (status, retry_count) WHERE status = 'failed';
CREATE INDEX IF NOT EXISTS idx_notif_provider_ref
    ON notifications (provider_ref) WHERE provider_ref IS NOT NULL;

-- Create initial partitions.
DO $$
DECLARE
    start_date DATE := DATE_TRUNC('month', CURRENT_DATE);
    end_date   DATE;
    part_name  TEXT;
    i          INT;
BEGIN
    FOR i IN 0..3 LOOP
        end_date := start_date + INTERVAL '1 month';
        part_name := 'notifications_' || TO_CHAR(start_date, 'YYYY_MM');
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS %I PARTITION OF notifications
             FOR VALUES FROM (%L) TO (%L)',
            part_name, start_date::TEXT, end_date::TEXT
        );
        start_date := end_date;
    END LOOP;
END $$;

COMMENT ON TABLE notifications IS 'Outbound notification delivery records';
