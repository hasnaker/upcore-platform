-- 001_audit_events.sql
-- Append-only, monthly-partitioned audit events table.

CREATE TABLE IF NOT EXISTS audit_events (
    id              UUID        NOT NULL,
    tenant_id       UUID        NOT NULL,
    occurred_at     TIMESTAMPTZ NOT NULL,
    event_type      TEXT        NOT NULL,
    actor_type      TEXT        NOT NULL DEFAULT 'system',
    actor_id        UUID,
    actor_email     TEXT,
    resource_type   TEXT,
    resource_id     UUID,
    service         TEXT        NOT NULL,
    action          TEXT        NOT NULL,
    result          TEXT        NOT NULL DEFAULT 'success',
    ip_address      INET,
    user_agent      TEXT,
    correlation_id  TEXT,
    changes         JSONB,
    metadata        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, occurred_at)
) PARTITION BY RANGE (occurred_at);

-- Indexes on the parent table propagate to partitions.
CREATE INDEX IF NOT EXISTS idx_audit_events_tenant
    ON audit_events (tenant_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_actor
    ON audit_events (actor_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_resource
    ON audit_events (resource_type, resource_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_service_action
    ON audit_events (service, action, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_correlation
    ON audit_events (correlation_id) WHERE correlation_id IS NOT NULL;

COMMENT ON TABLE audit_events IS 'Immutable, append-only audit log partitioned by month';
