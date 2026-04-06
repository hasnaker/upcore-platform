-- 001_assessments.up.sql
-- Assessments table for the assessment service.

CREATE SCHEMA IF NOT EXISTS app;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS app.assessments (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID NOT NULL,
    employee_id      UUID,
    candidate_email  TEXT,
    candidate_name   TEXT,
    instrument_code  TEXT NOT NULL
                     CHECK (instrument_code IN ('BAT-12-TR', 'COPSOQ', 'UPCAP')),
    status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'in_progress', 'completed', 'scored', 'expired', 'cancelled')),
    candidate_token  TEXT NOT NULL UNIQUE,
    assigned_by      UUID,
    expires_at       TIMESTAMPTZ,
    metadata         JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_assessments_tenant
    ON app.assessments (tenant_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_assessments_tenant_status
    ON app.assessments (tenant_id, status) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_assessments_employee
    ON app.assessments (tenant_id, employee_id) WHERE deleted_at IS NULL AND employee_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_assessments_candidate_token
    ON app.assessments (candidate_token) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_assessments_instrument
    ON app.assessments (tenant_id, instrument_code) WHERE deleted_at IS NULL;

-- Enable row-level security
ALTER TABLE app.assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS assessments_tenant_isolation ON app.assessments;
CREATE POLICY assessments_tenant_isolation ON app.assessments
    USING (
        current_setting('app.tenant_id', true) IS NULL
        OR current_setting('app.tenant_id', true) = ''
        OR tenant_id::text = current_setting('app.tenant_id', true)
    );
