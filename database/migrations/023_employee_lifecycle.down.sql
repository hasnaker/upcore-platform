-- =============================================================================
-- 023_employee_lifecycle.down.sql
-- Rollback: Çalışan full lifecycle tabloları
-- =============================================================================

SET search_path TO app, public;

-- Retention entries
DELETE FROM app.retention_policies
    WHERE name IN ('offer_letters_expired_2y','exit_interviews_anon_5y');

-- Triggers
DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'offer_letters',
        'onboarding_checklists',
        'onboarding_tasks',
        'compensation_records',
        'related_contacts',
        'employee_positions',
        'offboarding_events',
        'exit_interviews'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated_at ON app.%s', t, t);
    END LOOP;
END$$;

-- Tables (reverse dependency order)
DROP TABLE IF EXISTS app.exit_interviews          CASCADE;
DROP TABLE IF EXISTS app.offboarding_events       CASCADE;
DROP TABLE IF EXISTS app.employee_positions       CASCADE;
DROP TABLE IF EXISTS app.related_contacts         CASCADE;
DROP TABLE IF EXISTS app.compensation_records     CASCADE;
DROP TABLE IF EXISTS app.career_events            CASCADE;
DROP TABLE IF EXISTS app.onboarding_tasks         CASCADE;
DROP TABLE IF EXISTS app.onboarding_checklists    CASCADE;
DROP TABLE IF EXISTS app.offer_letters            CASCADE;
