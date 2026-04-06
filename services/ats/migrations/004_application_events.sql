-- 004_application_events.sql
-- Create application_events table (append-only audit trail).

CREATE TABLE IF NOT EXISTS app.application_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    application_id UUID NOT NULL REFERENCES app.applications(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL
        CHECK (event_type IN ('stage_changed', 'note_added', 'score_updated', 'interview_scheduled', 'offer_sent', 'offer_accepted', 'offer_declined')),
    from_stage VARCHAR(50),
    to_stage VARCHAR(50),
    actor_id UUID,
    payload JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_events_application ON app.application_events (application_id, created_at);
CREATE INDEX IF NOT EXISTS idx_app_events_tenant ON app.application_events (tenant_id);
CREATE INDEX IF NOT EXISTS idx_app_events_type ON app.application_events (event_type);
