-- 003_kvkk_access_log.sql
-- KVKK personal data access log, partitioned by month.

CREATE TABLE IF NOT EXISTS kvkk_access_log (
    id                  UUID        NOT NULL,
    tenant_id           UUID        NOT NULL,
    data_subject_id     UUID        NOT NULL,
    data_subject_email  TEXT        NOT NULL,
    accessor_user_id    UUID        NOT NULL,
    accessor_role       TEXT        NOT NULL,
    purpose             TEXT        NOT NULL,
    legal_basis         TEXT        NOT NULL
        CHECK (legal_basis IN (
            'consent','contract','legal_obligation',
            'vital_interest','public_task','legitimate_interest'
        )),
    data_categories     TEXT[]      NOT NULL DEFAULT '{}',
    accessed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address          INET,
    consent_ref         UUID,
    PRIMARY KEY (id, accessed_at)
) PARTITION BY RANGE (accessed_at);

CREATE INDEX IF NOT EXISTS idx_kvkk_subject
    ON kvkk_access_log (tenant_id, data_subject_id, accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_kvkk_accessor
    ON kvkk_access_log (tenant_id, accessor_user_id, accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_kvkk_legal_basis
    ON kvkk_access_log (tenant_id, legal_basis);

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
        part_name := 'kvkk_access_log_' || TO_CHAR(start_date, 'YYYY_MM');

        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS %I PARTITION OF kvkk_access_log
             FOR VALUES FROM (%L) TO (%L)',
            part_name,
            start_date::TEXT,
            end_date::TEXT
        );

        start_date := end_date;
    END LOOP;
END $$;

COMMENT ON TABLE kvkk_access_log IS 'Records every access to personal data per KVKK 5. madde';
