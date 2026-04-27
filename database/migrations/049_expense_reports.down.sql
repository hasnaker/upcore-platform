-- 049_expense_reports.down.sql — rollback migration 049.

BEGIN;

DROP TRIGGER IF EXISTS expense_items_total_refresh ON app.expense_items;
DROP FUNCTION IF EXISTS app.recompute_expense_total();

DROP POLICY IF EXISTS expense_approvals_tenant_iso ON app.expense_approvals;
DROP POLICY IF EXISTS expense_items_tenant_iso ON app.expense_items;
DROP POLICY IF EXISTS expense_reports_tenant_iso ON app.expense_reports;

DROP TABLE IF EXISTS app.expense_approvals;
DROP TABLE IF EXISTS app.expense_items;
DROP TABLE IF EXISTS app.expense_reports;

DROP TYPE IF EXISTS app.expense_status;

COMMIT;
