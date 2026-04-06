-- =============================================================================
-- 009_leaves.down.sql
-- =============================================================================
DROP TRIGGER IF EXISTS trg_leave_balances_updated_at ON app.leave_balances;
DROP TABLE IF EXISTS app.leave_balances CASCADE;
DROP TRIGGER IF EXISTS trg_leave_requests_updated_at ON app.leave_requests;
DROP TABLE IF EXISTS app.leave_requests CASCADE;
DROP TRIGGER IF EXISTS trg_leave_types_updated_at ON app.leave_types;
DROP TABLE IF EXISTS app.leave_types CASCADE;
