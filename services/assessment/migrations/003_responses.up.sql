-- 003_responses.up.sql
-- Assessment responses table.

CREATE TABLE IF NOT EXISTS app.assessment_responses (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id         UUID NOT NULL REFERENCES app.assessment_sessions(id) ON DELETE CASCADE,
    assessment_id      UUID NOT NULL REFERENCES app.assessments(id) ON DELETE CASCADE,
    tenant_id          UUID NOT NULL,
    item_code          TEXT NOT NULL,
    item_index         INTEGER NOT NULL,
    response_value     INTEGER NOT NULL,
    response_text      TEXT,
    time_spent_seconds DOUBLE PRECISION NOT NULL DEFAULT 0,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_responses_assessment
    ON app.assessment_responses (assessment_id);

CREATE INDEX IF NOT EXISTS idx_responses_session
    ON app.assessment_responses (session_id);

CREATE INDEX IF NOT EXISTS idx_responses_tenant
    ON app.assessment_responses (tenant_id);

-- Prevent duplicate responses for the same item in the same session.
CREATE UNIQUE INDEX IF NOT EXISTS ux_responses_session_item
    ON app.assessment_responses (session_id, item_code);
