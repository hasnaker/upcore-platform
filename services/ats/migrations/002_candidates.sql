-- 002_candidates.sql
-- Create candidates table for the ATS service.

CREATE TABLE IF NOT EXISTS app.candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    email VARCHAR(500) NOT NULL,
    first_name VARCHAR(200) NOT NULL,
    last_name VARCHAR(200) NOT NULL,
    phone VARCHAR(50),
    linkedin_url VARCHAR(1000),
    cv_blob_path VARCHAR(1000),
    cv_text_extracted TEXT,
    source VARCHAR(50) NOT NULL DEFAULT 'direct'
        CHECK (source IN ('kariyer_net', 'linkedin', 'referral', 'direct', 'other')),
    referrer_employee_id UUID,
    tags TEXT[] DEFAULT '{}',
    gdpr_consent BOOLEAN NOT NULL DEFAULT FALSE,
    gdpr_consent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE (tenant_id, email)
);

CREATE INDEX IF NOT EXISTS idx_candidates_tenant ON app.candidates (tenant_id);
CREATE INDEX IF NOT EXISTS idx_candidates_email ON app.candidates (tenant_id, email);
CREATE INDEX IF NOT EXISTS idx_candidates_source ON app.candidates (tenant_id, source);
CREATE INDEX IF NOT EXISTS idx_candidates_deleted ON app.candidates (tenant_id) WHERE deleted_at IS NULL;

-- Full-text search on CV content + name.
CREATE INDEX IF NOT EXISTS idx_candidates_fts ON app.candidates
    USING GIN (to_tsvector('simple', COALESCE(first_name, '') || ' ' || COALESCE(last_name, '') || ' ' || COALESCE(cv_text_extracted, '')));
