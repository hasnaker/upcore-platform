-- =============================================================================
-- 015_burnout_signals.up.sql
-- Burnout feature store (partitioned monthly by signal date)
-- =============================================================================

-- Parent partitioned table ---------------------------------------------------
CREATE TABLE app.burnout_signals (
    id              uuid NOT NULL DEFAULT gen_random_uuid(),
    tenant_id       uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    employee_id     uuid NOT NULL REFERENCES app.employees(id) ON DELETE CASCADE,
    ts              date NOT NULL,
    feature_name    varchar(80) NOT NULL,
    feature_value   double precision,
    feature_text    text,
    source          varchar(60) NOT NULL DEFAULT 'internal',
    confidence      numeric(4,3) CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 1),
    metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at      timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (id, ts)
) PARTITION BY RANGE (ts);

CREATE INDEX idx_burnout_signals_tenant_emp_ts ON app.burnout_signals (tenant_id, employee_id, ts DESC);
CREATE INDEX idx_burnout_signals_feature_ts    ON app.burnout_signals (feature_name, ts DESC);
CREATE INDEX idx_burnout_signals_tenant_ts     ON app.burnout_signals (tenant_id, ts DESC);

-- Default catch-all partition -------------------------------------------------
CREATE TABLE app.burnout_signals_default PARTITION OF app.burnout_signals DEFAULT;

-- Monthly partitions: current-3 .. current+12 months --------------------------
DO $$
DECLARE
    v_start date := date_trunc('month', CURRENT_DATE - interval '3 months')::date;
    v_month date;
    v_next  date;
    v_name  text;
BEGIN
    FOR i IN 0..15 LOOP
        v_month := (v_start + (i || ' months')::interval)::date;
        v_next  := (v_month + interval '1 month')::date;
        v_name  := 'burnout_signals_' || to_char(v_month, 'YYYY_MM');
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS app.%I PARTITION OF app.burnout_signals FOR VALUES FROM (%L) TO (%L);',
            v_name, v_month, v_next
        );
    END LOOP;
END$$;

COMMENT ON TABLE app.burnout_signals IS 'Feature store for burnout model — partitioned monthly by ts.';
COMMENT ON COLUMN app.burnout_signals.feature_name IS 'Ör: workload_hours, late_nights_count, leave_days_used, meeting_load, etc.';
