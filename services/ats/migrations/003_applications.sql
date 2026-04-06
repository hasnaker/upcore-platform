-- 003_applications.sql
-- Create applications table for the ATS service.

CREATE TABLE IF NOT EXISTS app.applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    candidate_id UUID NOT NULL REFERENCES app.candidates(id) ON DELETE CASCADE,
    requisition_id UUID NOT NULL REFERENCES app.requisitions(id) ON DELETE CASCADE,
    current_stage VARCHAR(50) NOT NULL DEFAULT 'applied'
        CHECK (current_stage IN ('applied', 'screened', 'assessed', 'interviewed', 'offered', 'hired', 'rejected', 'withdrawn')),
    stage_entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    score NUMERIC(5, 2),
    rejection_reason TEXT,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (candidate_id, requisition_id)
);

CREATE INDEX IF NOT EXISTS idx_applications_tenant ON app.applications (tenant_id);
CREATE INDEX IF NOT EXISTS idx_applications_requisition ON app.applications (requisition_id, current_stage);
CREATE INDEX IF NOT EXISTS idx_applications_candidate ON app.applications (candidate_id);
CREATE INDEX IF NOT EXISTS idx_applications_stage ON app.applications (tenant_id, current_stage);
