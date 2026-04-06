-- =============================================================================
-- 020_indexes_final.up.sql
-- Final performance indexes, materialized views, and composite keys
-- =============================================================================

-- Composite tenant+FK indexes for common RLS-filtered queries -----------------
CREATE INDEX IF NOT EXISTS idx_employees_tenant_dept_status
    ON app.employees(tenant_id, department_id, employment_status)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_assessments_tenant_emp_submitted
    ON app.assessments(tenant_id, employee_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_leave_requests_tenant_emp_dates
    ON app.leave_requests(tenant_id, employee_id, start_date DESC, end_date DESC);

CREATE INDEX IF NOT EXISTS idx_applications_tenant_position_stage
    ON app.applications(tenant_id, open_position_id, stage, applied_at DESC);

-- Partial indexes for active records ------------------------------------------
CREATE INDEX IF NOT EXISTS idx_int_assignments_active
    ON app.intervention_assignments(tenant_id, employee_id)
    WHERE status IN ('assigned','in_progress');

CREATE INDEX IF NOT EXISTS idx_notifications_pending_sched
    ON app.notifications(scheduled_at)
    WHERE status = 'pending' AND scheduled_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_surveys_active_dates
    ON app.surveys(tenant_id, starts_at, ends_at)
    WHERE status = 'active';

-- JSONB expression indexes (common filter paths) ------------------------------
CREATE INDEX IF NOT EXISTS idx_employees_metadata_gin
    ON app.employees USING gin (metadata);

CREATE INDEX IF NOT EXISTS idx_positions_requirements_gin
    ON app.position_definitions USING gin (required_skills);

CREATE INDEX IF NOT EXISTS idx_candidates_languages_gin
    ON app.candidates USING gin (languages);

-- Foreign key coverage indexes (avoids seq scans on DELETE CASCADE) -----------
CREATE INDEX IF NOT EXISTS idx_employment_history_old_dept ON app.employment_history(old_department_id);
CREATE INDEX IF NOT EXISTS idx_employment_history_new_dept ON app.employment_history(new_department_id);
CREATE INDEX IF NOT EXISTS idx_employment_history_old_pos  ON app.employment_history(old_position_id);
CREATE INDEX IF NOT EXISTS idx_employment_history_new_pos  ON app.employment_history(new_position_id);

-- Audit read performance (tenant scoped) --------------------------------------
CREATE INDEX IF NOT EXISTS idx_audit_events_tenant_action_time
    ON audit.events (tenant_id, action, occurred_at DESC);

-- Statistics targets for query planner ----------------------------------------
ALTER TABLE app.employees ALTER COLUMN tenant_id SET STATISTICS 1000;
ALTER TABLE app.assessments ALTER COLUMN tenant_id SET STATISTICS 1000;
ALTER TABLE app.leave_requests ALTER COLUMN tenant_id SET STATISTICS 1000;
ALTER TABLE app.notifications ALTER COLUMN tenant_id SET STATISTICS 1000;

ANALYZE app.tenants;
ANALYZE app.users;
ANALYZE app.employees;
ANALYZE app.assessments;
