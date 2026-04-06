-- 002_sessions.up.sql
-- Assessment sessions table.

CREATE TABLE IF NOT EXISTS app.assessment_sessions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id       UUID NOT NULL REFERENCES app.assessments(id) ON DELETE CASCADE,
    tenant_id           UUID NOT NULL,
    status              TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'paused', 'completed', 'timed_out')),
    started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at        TIMESTAMPTZ,
    time_limit_seconds  INTEGER NOT NULL DEFAULT 5400,
    elapsed_seconds     INTEGER NOT NULL DEFAULT 0,
    current_item_index  INTEGER NOT NULL DEFAULT 0,
    total_items         INTEGER NOT NULL DEFAULT 0,
    cheating_metrics    JSONB NOT NULL DEFAULT '{}'::jsonb,
    browser_fingerprint TEXT,
    ip_address          TEXT,
    user_agent          TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_assessment
    ON app.assessment_sessions (assessment_id);

CREATE INDEX IF NOT EXISTS idx_sessions_assessment_active
    ON app.assessment_sessions (assessment_id, status)
    WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_sessions_tenant
    ON app.assessment_sessions (tenant_id);
