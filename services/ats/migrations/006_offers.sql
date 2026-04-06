-- 006_offers.sql
-- Create offers table for the ATS service.

CREATE TABLE IF NOT EXISTS app.offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    application_id UUID NOT NULL REFERENCES app.applications(id) ON DELETE CASCADE,
    salary_try NUMERIC(15, 2) NOT NULL CHECK (salary_try > 0),
    bonus_try NUMERIC(15, 2),
    start_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    benefits JSONB DEFAULT '{}',
    status VARCHAR(50) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'sent', 'accepted', 'declined', 'expired', 'withdrawn')),
    document_id UUID,
    sent_at TIMESTAMPTZ,
    responded_at TIMESTAMPTZ,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offers_application ON app.offers (application_id);
CREATE INDEX IF NOT EXISTS idx_offers_tenant ON app.offers (tenant_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON app.offers (status);
CREATE INDEX IF NOT EXISTS idx_offers_expiry ON app.offers (expiry_date) WHERE status = 'sent';
