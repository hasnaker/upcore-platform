-- 047_feature_flags_groups.up.sql
-- Feature flags (tenant-level rollout) + multi-company group (holding içi
-- birden fazla sicil).

-- Feature flag tablosu: tenant bazında on/off.
CREATE TABLE IF NOT EXISTS app.feature_flags (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         uuid,                   -- NULL = global default
    flag_key          varchar(80) NOT NULL,   -- snake_case, e.g. mobile_pwa
    enabled           boolean NOT NULL,
    rollout_pct       smallint CHECK (rollout_pct BETWEEN 0 AND 100),
    description       text,
    updated_by        uuid,
    updated_at        timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, flag_key)
);

CREATE INDEX IF NOT EXISTS idx_feature_flags_tenant
    ON app.feature_flags (tenant_id, flag_key);

ALTER TABLE app.feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY feature_flags_rls ON app.feature_flags
    USING (tenant_id IS NULL OR tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

-- Multi-company group: bir holding altında birden fazla şirket (her biri
-- kendi vergi no'su, SGK sicili, sözleşme tipi ile). Tenant = holding,
-- company = alt sicil.
CREATE TABLE IF NOT EXISTS app.company_groups (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         uuid NOT NULL,
    code              varchar(40) NOT NULL,
    name              varchar(200) NOT NULL,
    vkn               varchar(20),
    sgk_sicil_no      varchar(40),
    vergi_dairesi     varchar(200),
    address           text,
    is_primary        boolean NOT NULL DEFAULT FALSE,
    active            boolean NOT NULL DEFAULT TRUE,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, code)
);

-- Bir çalışan hangi şirket'e bağlı? (employees tablosuna ek sütun)
ALTER TABLE app.employees
    ADD COLUMN IF NOT EXISTS company_group_id uuid
        REFERENCES app.company_groups(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_employees_company_group
    ON app.employees (tenant_id, company_group_id)
    WHERE deleted_at IS NULL;

ALTER TABLE app.company_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY company_groups_rls ON app.company_groups
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

-- Seed global flags (rollout için).
INSERT INTO app.feature_flags (tenant_id, flag_key, enabled, description) VALUES
(NULL, 'bordro_657_kamu',    TRUE,  '657 kamu bordro hesaplayıcı (belediye paketi)'),
(NULL, 'saml_sso',           FALSE, 'Enterprise SAML SSO (Growth+ plan)'),
(NULL, 'ml_burnout',         FALSE, 'ML burnout tahmini (Scale+ plan)'),
(NULL, 'internal_marketplace', FALSE, 'Dahili kariyer marketplace'),
(NULL, 'webhooks_public',    FALSE, 'Customer-defined webhook subscriptions'),
(NULL, 'api_keys_public',    FALSE, 'Public API key management'),
(NULL, 'multi_company',      FALSE, 'Holding içi birden fazla şirket/sicil'),
(NULL, 'mobile_pwa',         TRUE,  'Mobile PWA + offline shell'),
(NULL, 'white_label',        FALSE, 'Tenant branding override')
ON CONFLICT (tenant_id, flag_key) DO NOTHING;

COMMENT ON TABLE app.feature_flags IS 'Global + tenant override feature flags — plan gate + kademeli rollout';
COMMENT ON TABLE app.company_groups IS 'Holding içi alt şirket (farklı vergi no/SGK sicili). Bordro ve muhtasar company_group bazında ayrı raporlanır';
