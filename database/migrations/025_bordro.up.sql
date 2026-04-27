-- =============================================================================
-- 025_bordro.up.sql
-- V3 Dalga 2.1: Türkiye bordro motoru
--   - payroll_periods         (aylık/dönem)
--   - payroll_runs            (dönem + "preview" / "finalised")
--   - payroll_slips           (çalışan başı bordro)
--   - payroll_slip_items      (maaş kalem kırılımı)
--   - payroll_tax_brackets    (GVK md.103 2026 dilimleri + kümülatif)
--   - sgk_bildirgeleri        (APB/İGB/İAB)
-- =============================================================================

SET search_path TO app, public;

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Payroll Periods
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app.payroll_periods (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      UUID        NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    period_year    INT         NOT NULL CHECK (period_year BETWEEN 2000 AND 2100),
    period_month   INT         NOT NULL CHECK (period_month BETWEEN 1 AND 12),
    start_date     DATE        NOT NULL,
    end_date       DATE        NOT NULL CHECK (end_date >= start_date),
    pay_date       DATE        NOT NULL,
    status         TEXT        NOT NULL DEFAULT 'open'
                               CHECK (status IN ('open','locked','finalised','closed')),
    created_by     UUID,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, period_year, period_month)
);

CREATE INDEX IF NOT EXISTS idx_payroll_periods_tenant_year_month ON app.payroll_periods (tenant_id, period_year DESC, period_month DESC);

ALTER TABLE app.payroll_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY payroll_periods_tenant_isolation ON app.payroll_periods
    USING (tenant_id::text = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));

-- ───────────────────────────────────────────────────────────────────────────
-- 2. Payroll Runs
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app.payroll_runs (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID        NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    period_id        UUID        NOT NULL REFERENCES app.payroll_periods(id) ON DELETE CASCADE,
    run_type         TEXT        NOT NULL DEFAULT 'regular'
                                 CHECK (run_type IN ('regular','bonus','ikramiye','off_cycle','correction')),
    status           TEXT        NOT NULL DEFAULT 'preview'
                                 CHECK (status IN ('preview','calculated','approved','finalised','voided')),
    total_gross      NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_net        NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_income_tax NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_sgk_emp    NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_sgk_empr   NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_stamp      NUMERIC(14,2) NOT NULL DEFAULT 0,
    employee_count   INT         NOT NULL DEFAULT 0,
    approved_by      UUID,
    approved_at      TIMESTAMPTZ,
    finalised_at     TIMESTAMPTZ,
    notes            TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payroll_runs_tenant_period ON app.payroll_runs (tenant_id, period_id);

ALTER TABLE app.payroll_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY payroll_runs_tenant_isolation ON app.payroll_runs
    USING (tenant_id::text = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));

-- ───────────────────────────────────────────────────────────────────────────
-- 3. Payroll Slips
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app.payroll_slips (
    id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id            UUID        NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    run_id               UUID        NOT NULL REFERENCES app.payroll_runs(id) ON DELETE CASCADE,
    employee_id          UUID        NOT NULL REFERENCES app.employees(id) ON DELETE CASCADE,
    period_year          INT         NOT NULL,
    period_month         INT         NOT NULL,
    worked_days          NUMERIC(5,2) NOT NULL DEFAULT 30,
    -- Brüt kalemler
    base_salary_gross    NUMERIC(12,2) NOT NULL DEFAULT 0,
    overtime_gross       NUMERIC(12,2) NOT NULL DEFAULT 0,
    bonus_gross          NUMERIC(12,2) NOT NULL DEFAULT 0,
    allowance_gross      NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_gross          NUMERIC(12,2) NOT NULL DEFAULT 0,
    -- Kesintiler
    sgk_employee         NUMERIC(12,2) NOT NULL DEFAULT 0,  -- %14 (5510 SGK + işsizlik)
    sgk_unemployment_emp NUMERIC(12,2) NOT NULL DEFAULT 0,  -- %1
    income_tax_base      NUMERIC(12,2) NOT NULL DEFAULT 0,  -- vergiye esas matrah
    income_tax           NUMERIC(12,2) NOT NULL DEFAULT 0,  -- GVK md.103
    cumulative_tax_base  NUMERIC(14,2) NOT NULL DEFAULT 0,
    stamp_tax            NUMERIC(12,2) NOT NULL DEFAULT 0,  -- binde 7.59
    -- İşveren yükleri
    sgk_employer         NUMERIC(12,2) NOT NULL DEFAULT 0,  -- %15.75 (veya %20.75)
    unemployment_employer NUMERIC(12,2) NOT NULL DEFAULT 0, -- %2
    -- Net ödeme
    total_net            NUMERIC(12,2) NOT NULL DEFAULT 0,
    -- Sistemsel
    metadata             JSONB       NOT NULL DEFAULT '{}'::jsonb,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, run_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_payroll_slips_tenant_employee_period ON app.payroll_slips (tenant_id, employee_id, period_year DESC, period_month DESC);

ALTER TABLE app.payroll_slips ENABLE ROW LEVEL SECURITY;
CREATE POLICY payroll_slips_tenant_isolation ON app.payroll_slips
    USING (tenant_id::text = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));

-- ───────────────────────────────────────────────────────────────────────────
-- 4. Slip Items (maaş kalem detayı)
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app.payroll_slip_items (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    slip_id      UUID        NOT NULL REFERENCES app.payroll_slips(id) ON DELETE CASCADE,
    item_type    TEXT        NOT NULL
                             CHECK (item_type IN ('earning','deduction','employer_contribution','info')),
    code         TEXT        NOT NULL,  -- base_salary, overtime_150, bonus_cash, agi vb.
    description  TEXT        NOT NULL,
    quantity     NUMERIC(8,2) NOT NULL DEFAULT 1,
    amount       NUMERIC(12,2) NOT NULL,
    is_taxable   BOOLEAN     NOT NULL DEFAULT TRUE,
    is_sgkable   BOOLEAN     NOT NULL DEFAULT TRUE,
    order_index  INT         NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_slip_items_slip ON app.payroll_slip_items (slip_id, order_index);

-- ───────────────────────────────────────────────────────────────────────────
-- 5. Tax Brackets (GVK Madde 103 — yıllık kümülatif)
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app.payroll_tax_brackets (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    year          INT         NOT NULL,
    ordinal       INT         NOT NULL,
    lower_bound   NUMERIC(14,2) NOT NULL,
    upper_bound   NUMERIC(14,2),  -- null = sınırsız
    rate_pct      NUMERIC(5,2) NOT NULL,
    is_wage_only  BOOLEAN     NOT NULL DEFAULT FALSE, -- ücret gelirleri için ayrı dilim
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (year, ordinal, is_wage_only)
);

-- 2026 GVK 103 ücret gelirleri dilimleri (Resmi Gazete 31.12.2025)
INSERT INTO app.payroll_tax_brackets (year, ordinal, lower_bound, upper_bound, rate_pct, is_wage_only) VALUES
    (2026, 1, 0,         158000,   15, TRUE),
    (2026, 2, 158000,    330000,   20, TRUE),
    (2026, 3, 330000,   1200000,   27, TRUE),
    (2026, 4, 1200000,  4300000,   35, TRUE),
    (2026, 5, 4300000,  NULL,      40, TRUE)
ON CONFLICT (year, ordinal, is_wage_only) DO NOTHING;

-- ───────────────────────────────────────────────────────────────────────────
-- 6. SGK Bildirgeleri (APB/İGB/İAB)
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app.sgk_bildirgeleri (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID        NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    employee_id      UUID        NOT NULL REFERENCES app.employees(id) ON DELETE CASCADE,
    bildirge_type    TEXT        NOT NULL
                                 CHECK (bildirge_type IN ('APB','IGB','IAB')),
    period_year      INT,
    period_month     INT,
    filing_reference TEXT,  -- e-Bildirge referans no
    filing_status    TEXT        NOT NULL DEFAULT 'draft'
                                 CHECK (filing_status IN ('draft','submitted','approved','rejected','amended')),
    filing_date      DATE,
    amount_gross     NUMERIC(12,2),
    sgk_base         NUMERIC(12,2),
    notes            TEXT,
    xml_payload      TEXT,  -- SGK e-Bildirge XML
    created_by       UUID,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sgk_bildirge_tenant_employee ON app.sgk_bildirgeleri (tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_sgk_bildirge_tenant_type_period ON app.sgk_bildirgeleri (tenant_id, bildirge_type, period_year, period_month);

ALTER TABLE app.sgk_bildirgeleri ENABLE ROW LEVEL SECURITY;
CREATE POLICY sgk_bildirge_tenant_isolation ON app.sgk_bildirgeleri
    USING (tenant_id::text = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));

-- ───────────────────────────────────────────────────────────────────────────
-- 7. updated_at triggers
-- ───────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'payroll_periods',
        'payroll_runs',
        'payroll_slips',
        'sgk_bildirgeleri'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated_at ON app.%s', t, t);
        EXECUTE format(
            'CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON app.%s FOR EACH ROW EXECUTE FUNCTION touch_updated_at()',
            t, t
        );
    END LOOP;
END$$;

-- ───────────────────────────────────────────────────────────────────────────
-- 8. Retention policies (bordro 10 yıl — Vergi Usul Kanunu madde 253)
-- ───────────────────────────────────────────────────────────────────────────
INSERT INTO app.retention_policies (name, table_name, retention_days, where_clause)
VALUES
    ('payroll_slips_10y', 'app.payroll_slips', 3650, 'created_at < NOW() - INTERVAL ''10 years'''),
    ('sgk_bildirge_10y',  'app.sgk_bildirgeleri', 3650, 'created_at < NOW() - INTERVAL ''10 years''')
ON CONFLICT (name) DO NOTHING;

COMMENT ON TABLE app.payroll_periods IS 'Aylık bordro dönemi (yıl+ay unique).';
COMMENT ON TABLE app.payroll_runs IS 'Bir dönem için hesap çalıştırması — preview → approved → finalised.';
COMMENT ON TABLE app.payroll_slips IS 'Çalışan başına aylık bordro satırı — tüm vergi kırılımı.';
COMMENT ON TABLE app.payroll_tax_brackets IS 'GVK 103 ücret gelirleri dilim tablosu, yıl bazlı.';
COMMENT ON TABLE app.sgk_bildirgeleri IS 'SGK e-Bildirge (APB=İşe Giriş, IGB=İşten Ayrılış, IAB=Aylık Prim ve Hizmet Bildirgesi).';
