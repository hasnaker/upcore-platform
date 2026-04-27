-- Onboarding drafts: wizard ilerlemesini tenant commit öncesi tutar.
CREATE TABLE IF NOT EXISTS tenant_onboarding_drafts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_user_id   VARCHAR(255) NOT NULL,
    admin_email     VARCHAR(320) NOT NULL,
    current_step    SMALLINT     NOT NULL DEFAULT 1
        CHECK (current_step BETWEEN 1 AND 10),
    status          VARCHAR(20)  NOT NULL DEFAULT 'in_progress'
        CHECK (status IN ('in_progress','committed','abandoned')),
    committed_tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    data            JSONB        NOT NULL DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_drafts_user
    ON tenant_onboarding_drafts(clerk_user_id)
    WHERE status = 'in_progress';

CREATE INDEX IF NOT EXISTS idx_onboarding_drafts_status
    ON tenant_onboarding_drafts(status);

CREATE OR REPLACE FUNCTION trg_onboarding_drafts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_onboarding_drafts_updated_at ON tenant_onboarding_drafts;
CREATE TRIGGER set_onboarding_drafts_updated_at
    BEFORE UPDATE ON tenant_onboarding_drafts
    FOR EACH ROW EXECUTE FUNCTION trg_onboarding_drafts_updated_at();
