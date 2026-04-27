-- ============================================================================
-- 049_expense_reports.up.sql — Expense management (masraf yönetimi)
-- Adds expense_reports + expense_items + approvals, scoped per tenant.
-- Reports flow: draft → submitted → approved/rejected → reimbursed.
-- Reimbursed reports can be pushed into the next bordro run as add-pays.
-- ============================================================================

BEGIN;

CREATE TYPE app.expense_status AS ENUM (
  'draft', 'submitted', 'approved', 'rejected', 'reimbursed', 'cancelled'
);

CREATE TABLE app.expense_reports (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  employee_id      UUID NOT NULL REFERENCES app.employees(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  period           TEXT,                                 -- YYYY-MM — reimbursement target bordro period
  currency         TEXT NOT NULL DEFAULT 'TRY',
  total_amount     NUMERIC(14,2) NOT NULL DEFAULT 0,      -- denormalised sum of items, refreshed on item CUD
  status           app.expense_status NOT NULL DEFAULT 'draft',
  notes            TEXT,
  submitted_at     TIMESTAMPTZ,
  decided_at       TIMESTAMPTZ,
  decided_by       UUID REFERENCES app.users(id),
  decision_note    TEXT,
  reimbursed_at    TIMESTAMPTZ,
  reimbursed_run_id UUID,                                -- FK to app.payroll_runs when pushed through bordro
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX expense_reports_tenant_employee_idx
  ON app.expense_reports(tenant_id, employee_id, status);
CREATE INDEX expense_reports_status_idx
  ON app.expense_reports(tenant_id, status, submitted_at DESC);

CREATE TABLE app.expense_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  report_id        UUID NOT NULL REFERENCES app.expense_reports(id) ON DELETE CASCADE,
  incurred_on      DATE NOT NULL,
  category         TEXT NOT NULL,                        -- travel, meal, accommodation, fuel, office_supplies, other
  vendor           TEXT,
  description      TEXT NOT NULL,
  amount           NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  vat_rate         NUMERIC(5,2) NOT NULL DEFAULT 20.00,  -- KDV % (TR default 20 from 2026-01)
  vat_amount       NUMERIC(12,2) GENERATED ALWAYS AS (amount - (amount / (1 + vat_rate / 100))) STORED,
  receipt_blob_url TEXT,                                 -- Azure Blob SAS URL (optional, via document service)
  receipt_mime     TEXT,
  project_code     TEXT,                                 -- for chargeback / cost center reporting
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX expense_items_report_idx
  ON app.expense_items(tenant_id, report_id);

CREATE TABLE app.expense_approvals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  report_id     UUID NOT NULL REFERENCES app.expense_reports(id) ON DELETE CASCADE,
  approver_id   UUID NOT NULL REFERENCES app.users(id),
  step_order    INT NOT NULL DEFAULT 1,
  decision      TEXT NOT NULL CHECK (decision IN ('pending','approved','rejected','delegated')),
  decision_note TEXT,
  decided_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX expense_approvals_report_idx
  ON app.expense_approvals(tenant_id, report_id, step_order);

-- RLS policies — mirror the other tenant-owned tables.
ALTER TABLE app.expense_reports   ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.expense_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.expense_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY expense_reports_tenant_iso ON app.expense_reports
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY expense_items_tenant_iso ON app.expense_items
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY expense_approvals_tenant_iso ON app.expense_approvals
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Keep total_amount fresh when items change.
CREATE OR REPLACE FUNCTION app.recompute_expense_total()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  rid UUID;
BEGIN
  rid := COALESCE(NEW.report_id, OLD.report_id);
  UPDATE app.expense_reports
    SET total_amount = COALESCE(
      (SELECT SUM(amount) FROM app.expense_items WHERE report_id = rid), 0
    ),
    updated_at = NOW()
  WHERE id = rid;
  RETURN NULL;
END;
$$;

CREATE TRIGGER expense_items_total_refresh
AFTER INSERT OR UPDATE OR DELETE ON app.expense_items
FOR EACH ROW EXECUTE FUNCTION app.recompute_expense_total();

COMMIT;
