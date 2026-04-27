-- 061_onboarding_wizard_flag.up.sql
-- Seed the global default for the onboarding wizard v1 feature flag.
-- Tenant-level overrides can still switch it off via POST /admin/feature-flags.
INSERT INTO app.feature_flags (tenant_id, flag_key, enabled, rollout_pct, description)
VALUES (NULL, 'onboarding_wizard_v1', TRUE, 100,
        'Self-serve 10-step tenant onboarding wizard. Default ON for new tenants; admin fallback (manual tenant creation) remains available.')
ON CONFLICT (tenant_id, flag_key) DO UPDATE
   SET enabled     = EXCLUDED.enabled,
       rollout_pct = EXCLUDED.rollout_pct,
       description = EXCLUDED.description,
       updated_at  = now();
