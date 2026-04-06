-- 005_interviews.sql
-- Create interviews table for the ATS service.

CREATE TABLE IF NOT EXISTS app.interviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    application_id UUID NOT NULL REFERENCES app.applications(id) ON DELETE CASCADE,
    round INT NOT NULL DEFAULT 1 CHECK (round > 0),
    scheduled_at TIMESTAMPTZ NOT NULL,
    duration_minutes INT NOT NULL DEFAULT 60 CHECK (duration_minutes > 0),
    interviewer_ids TEXT[] DEFAULT '{}',
    location VARCHAR(500),
    meeting_url VARCHAR(1000),
    status VARCHAR(50) NOT NULL DEFAULT 'scheduled'
        CHECK (status IN ('scheduled', 'completed', 'canceled', 'no_show')),
    feedback JSONB DEFAULT '{}',
    overall_score INT CHECK (overall_score IS NULL OR (overall_score >= 1 AND overall_score <= 5)),
    recommendation VARCHAR(50)
        CHECK (recommendation IS NULL OR recommendation IN ('strong_hire', 'hire', 'no_hire', 'strong_no_hire')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interviews_application ON app.interviews (application_id, round);
CREATE INDEX IF NOT EXISTS idx_interviews_tenant ON app.interviews (tenant_id);
CREATE INDEX IF NOT EXISTS idx_interviews_scheduled ON app.interviews (scheduled_at);
