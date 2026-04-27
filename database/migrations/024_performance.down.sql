-- =============================================================================
-- 024_performance.down.sql
-- Rollback: Performans modülü
-- =============================================================================

SET search_path TO app, public;

DELETE FROM app.retention_policies
    WHERE name IN ('perf_cycles_archived_5y','perf_reviews_final_5y','calib_sessions_done_3y');

DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'performance_cycles',
        'performance_goals',
        'okrs',
        'okr_key_results',
        'performance_reviews',
        'review_feedback',
        'nine_box_assignments',
        'calibration_sessions'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated_at ON app.%s', t, t);
    END LOOP;
END$$;

DROP TABLE IF EXISTS app.calibration_sessions    CASCADE;
DROP TABLE IF EXISTS app.nine_box_assignments    CASCADE;
DROP TABLE IF EXISTS app.review_feedback         CASCADE;
DROP TABLE IF EXISTS app.performance_reviews     CASCADE;
DROP TABLE IF EXISTS app.okr_key_results         CASCADE;
DROP TABLE IF EXISTS app.okrs                    CASCADE;
DROP TABLE IF EXISTS app.performance_goals       CASCADE;
DROP TABLE IF EXISTS app.performance_cycles      CASCADE;
