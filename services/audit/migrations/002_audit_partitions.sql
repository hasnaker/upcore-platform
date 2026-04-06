-- 002_audit_partitions.sql
-- Create initial monthly partitions for audit_events.
-- Additional partitions are managed by db.RunPartitionMaintenance at runtime.

DO $$
DECLARE
    start_date DATE := DATE_TRUNC('month', CURRENT_DATE);
    end_date   DATE;
    part_name  TEXT;
    i          INT;
BEGIN
    FOR i IN 0..3 LOOP
        end_date := start_date + INTERVAL '1 month';
        part_name := 'audit_events_' || TO_CHAR(start_date, 'YYYY_MM');

        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS %I PARTITION OF audit_events
             FOR VALUES FROM (%L) TO (%L)',
            part_name,
            start_date::TEXT,
            end_date::TEXT
        );

        start_date := end_date;
    END LOOP;
END $$;
