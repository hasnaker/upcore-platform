DROP TRIGGER IF EXISTS set_onboarding_drafts_updated_at ON tenant_onboarding_drafts;
DROP FUNCTION IF EXISTS trg_onboarding_drafts_updated_at();
DROP INDEX IF EXISTS idx_onboarding_drafts_status;
DROP INDEX IF EXISTS idx_onboarding_drafts_user;
DROP TABLE IF EXISTS tenant_onboarding_drafts;
