-- Plans: subscription tiers (public catalog).
CREATE TABLE IF NOT EXISTS plans (
    id              VARCHAR(40) PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    tier            VARCHAR(40)  NOT NULL
        CHECK (tier IN ('free','starter','growth','platform','enterprise')),
    price_monthly   BIGINT,
    features        JSONB        NOT NULL DEFAULT '{}'::jsonb,
    is_active       BOOLEAN      NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plans_tier_active ON plans(tier) WHERE is_active = true;

INSERT INTO plans (id, name, tier, price_monthly, features) VALUES
    ('free',       'Ücretsiz',   'free',       0,     '{"max_employees": 25,   "modules": ["core_hris"]}'::jsonb),
    ('starter',    'Başlangıç',  'starter',    1500,  '{"max_employees": 100,  "modules": ["core_hris","assessment"]}'::jsonb),
    ('growth',     'Büyüme',     'growth',     3000,  '{"max_employees": 500,  "modules": ["core_hris","assessment","burnout"]}'::jsonb),
    ('platform',   'Platform',   'platform',   5000,  '{"max_employees": 1500, "modules": ["core_hris","assessment","burnout","strengths","mobility"]}'::jsonb),
    ('enterprise', 'Kurumsal',   'enterprise', NULL,  '{"max_employees": null, "modules": ["all"]}'::jsonb)
ON CONFLICT (id) DO NOTHING;
