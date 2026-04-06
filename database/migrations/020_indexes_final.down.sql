-- =============================================================================
-- 020_indexes_final.down.sql
-- =============================================================================
DROP INDEX IF EXISTS app.idx_employees_tenant_dept_status;
DROP INDEX IF EXISTS app.idx_assessments_tenant_emp_submitted;
DROP INDEX IF EXISTS app.idx_leave_requests_tenant_emp_dates;
DROP INDEX IF EXISTS app.idx_applications_tenant_position_stage;
DROP INDEX IF EXISTS app.idx_int_assignments_active;
DROP INDEX IF EXISTS app.idx_notifications_pending_sched;
DROP INDEX IF EXISTS app.idx_surveys_active_dates;
DROP INDEX IF EXISTS app.idx_employees_metadata_gin;
DROP INDEX IF EXISTS app.idx_positions_requirements_gin;
DROP INDEX IF EXISTS app.idx_candidates_languages_gin;
DROP INDEX IF EXISTS app.idx_employment_history_old_dept;
DROP INDEX IF EXISTS app.idx_employment_history_new_dept;
DROP INDEX IF EXISTS app.idx_employment_history_old_pos;
DROP INDEX IF EXISTS app.idx_employment_history_new_pos;
DROP INDEX IF EXISTS audit.idx_audit_events_tenant_action_time;

ALTER TABLE app.employees ALTER COLUMN tenant_id SET STATISTICS -1;
ALTER TABLE app.assessments ALTER COLUMN tenant_id SET STATISTICS -1;
ALTER TABLE app.leave_requests ALTER COLUMN tenant_id SET STATISTICS -1;
ALTER TABLE app.notifications ALTER COLUMN tenant_id SET STATISTICS -1;
