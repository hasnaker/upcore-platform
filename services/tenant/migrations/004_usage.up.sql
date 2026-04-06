-- Usage counters: per-tenant per-metric per-period accumulators.
CREATE TABLE IF NOT EXISTS usage_counters (
    tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    metric          VARCHAR(40) NOT NULL
        CHECK (metric IN ('employees','assessments','storage_mb','api_calls')),
    value           BIGINT      NOT NULL DEFAULT 0,
    period_start    TIMESTAMPTZ NOT NULL,
    period_end      TIMESTAMPTZ NOT NULL,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, metric, period_start)
);

CREATE INDEX IF NOT EXISTS idx_usage_tenant_period ON usage_counters(tenant_id, period_start);
