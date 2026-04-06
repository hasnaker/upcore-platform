-- 004_inapp.sql
-- In-app notifications displayed within the application UI.

CREATE TABLE IF NOT EXISTS notification_inapp (
    id         UUID        NOT NULL,
    tenant_id  UUID        NOT NULL,
    user_id    UUID        NOT NULL,
    title      TEXT        NOT NULL,
    body       TEXT        NOT NULL,
    link_url   TEXT,
    category   TEXT        NOT NULL DEFAULT 'system',
    is_read    BOOLEAN     NOT NULL DEFAULT false,
    read_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE INDEX IF NOT EXISTS idx_inapp_user_unread
    ON notification_inapp (tenant_id, user_id, is_read, created_at DESC);

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
        part_name := 'notification_inapp_' || TO_CHAR(start_date, 'YYYY_MM');
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS %I PARTITION OF notification_inapp
             FOR VALUES FROM (%L) TO (%L)',
            part_name, start_date::TEXT, end_date::TEXT
        );
        start_date := end_date;
    END LOOP;
END $$;

COMMENT ON TABLE notification_inapp IS 'In-app notifications with read tracking';
