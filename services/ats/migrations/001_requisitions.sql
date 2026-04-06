-- 001_requisitions.sql
-- Create requisitions table for the ATS service.

CREATE TABLE IF NOT EXISTS app.requisitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    position_id UUID,
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    requirements TEXT,
    headcount INT NOT NULL DEFAULT 1 CHECK (headcount > 0),
    location VARCHAR(500),
    employment_type VARCHAR(50) NOT NULL DEFAULT 'full_time'
        CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'intern')),
    salary_min NUMERIC(15, 2),
    salary_max NUMERIC(15, 2),
    status VARCHAR(50) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'open', 'on_hold', 'filled', 'closed')),
    hiring_manager_id UUID,
    recruiter_id UUID,
    opened_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_requisitions_tenant ON app.requisitions (tenant_id);
CREATE INDEX IF NOT EXISTS idx_requisitions_status ON app.requisitions (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_requisitions_hiring_manager ON app.requisitions (tenant_id, hiring_manager_id);
CREATE INDEX IF NOT EXISTS idx_requisitions_recruiter ON app.requisitions (tenant_id, recruiter_id);
