-- 061_onboarding_wizard_flag.down.sql
DELETE FROM app.feature_flags
 WHERE tenant_id IS NULL
   AND flag_key = 'onboarding_wizard_v1';
