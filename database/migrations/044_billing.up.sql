-- 044_billing.up.sql
-- Abonelik + fatura + ödeme + subscription plan. Iyzico (TR) ve Stripe
-- (uluslararası) adapter'ları ile uyumlu generic schema.

CREATE TABLE IF NOT EXISTS app.billing_plans (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code                 varchar(40) UNIQUE NOT NULL,  -- starter|growth|scale|enterprise
    name                 varchar(100) NOT NULL,
    monthly_price_try    numeric(12, 2) NOT NULL,
    monthly_price_usd    numeric(12, 2),
    included_employees   integer NOT NULL,
    overage_per_employee numeric(8, 2) NOT NULL DEFAULT 0,
    features             jsonb NOT NULL DEFAULT '{}'::jsonb,
    active               boolean NOT NULL DEFAULT TRUE,
    created_at           timestamptz NOT NULL DEFAULT now()
);

-- Tenant abonelikleri. Bir tenant aynı anda yalnız bir aktif subscription'a sahip.
CREATE TABLE IF NOT EXISTS app.billing_subscriptions (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id            uuid NOT NULL,
    plan_id              uuid NOT NULL REFERENCES app.billing_plans(id) ON DELETE RESTRICT,
    status               varchar(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('trialing','active','past_due','paused','canceled','expired')),
    starts_at            timestamptz NOT NULL DEFAULT now(),
    renews_at            timestamptz,
    canceled_at          timestamptz,
    provider             varchar(20) NOT NULL DEFAULT 'manual',  -- iyzico|stripe|manual
    provider_customer_id varchar(100),
    provider_sub_id      varchar(100),
    trial_ends_at        timestamptz,
    notes                text,
    created_at           timestamptz NOT NULL DEFAULT now(),
    updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_billing_sub_active
    ON app.billing_subscriptions (tenant_id)
    WHERE status IN ('trialing','active','past_due','paused');

CREATE TABLE IF NOT EXISTS app.billing_invoices (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id            uuid NOT NULL,
    subscription_id      uuid REFERENCES app.billing_subscriptions(id) ON DELETE SET NULL,
    invoice_no           varchar(40) UNIQUE,
    period_start         date NOT NULL,
    period_end           date NOT NULL,
    subtotal_try         numeric(12, 2) NOT NULL,
    kdv_try              numeric(12, 2) NOT NULL DEFAULT 0,
    total_try            numeric(12, 2) NOT NULL,
    currency             varchar(8) NOT NULL DEFAULT 'TRY',
    status               varchar(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft','issued','paid','overdue','void','refunded')),
    issued_at            timestamptz,
    due_at               timestamptz,
    paid_at              timestamptz,
    provider_invoice_id  varchar(100),
    pdf_url              text,
    line_items           jsonb NOT NULL DEFAULT '[]'::jsonb,
    created_at           timestamptz NOT NULL DEFAULT now(),
    updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_invoices_tenant_period
    ON app.billing_invoices (tenant_id, period_start DESC);

CREATE TABLE IF NOT EXISTS app.billing_payments (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id            uuid NOT NULL,
    invoice_id           uuid REFERENCES app.billing_invoices(id) ON DELETE SET NULL,
    amount_try           numeric(12, 2) NOT NULL,
    method               varchar(20) NOT NULL,      -- card|wire|manual
    status               varchar(20) NOT NULL,      -- succeeded|failed|refunded|pending
    provider_payment_id  varchar(100),
    failure_reason       text,
    retried_at           timestamptz,
    retry_count          integer NOT NULL DEFAULT 0,
    created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_payments_invoice
    ON app.billing_payments (invoice_id);

ALTER TABLE app.billing_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY billing_sub_rls ON app.billing_subscriptions
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);
ALTER TABLE app.billing_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY billing_inv_rls ON app.billing_invoices
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);
ALTER TABLE app.billing_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY billing_pay_rls ON app.billing_payments
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

-- Seed 4 plan tier.
INSERT INTO app.billing_plans (code, name, monthly_price_try, included_employees, overage_per_employee, features) VALUES
('starter',    'Starter',     2490,   25,  80,  '{"ats":true,"bordro":true,"assessment":false,"saml":false}'),
('growth',     'Growth',      7490,  100,  60,  '{"ats":true,"bordro":true,"assessment":true,"saml":false}'),
('scale',      'Scale',      19900,  500,  45,  '{"ats":true,"bordro":true,"assessment":true,"saml":true,"ml":true}'),
('enterprise', 'Enterprise',     0,    0,   0,  '{"all":true,"dedicated_support":true,"sla":"99.95"}')
ON CONFLICT (code) DO NOTHING;

COMMENT ON TABLE app.billing_subscriptions IS 'Tenant abonelikleri — bir tenant tek aktif sub''a sahip (partial unique index)';
COMMENT ON TABLE app.billing_invoices IS 'Aylık fatura — KDV ayrı + line_items jsonb (plan+overage kırılımı)';
COMMENT ON TABLE app.billing_payments IS 'Ödeme denemeleri — failed durumunda retry_count artar, 3 deneme sonrası manual review';
