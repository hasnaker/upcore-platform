-- =============================================================================
-- 002_tenants.up.sql
-- Tenants (multi-tenant root) + data residency + plan metadata
-- =============================================================================

CREATE TABLE app.tenants (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name            varchar(200) NOT NULL,
    slug            varchar(80)  NOT NULL,
    legal_name      varchar(300),
    tax_id          varchar(50),               -- Vergi Numarası / Mersis No
    country         char(2)      NOT NULL DEFAULT 'TR',
    language        varchar(10)  NOT NULL DEFAULT 'tr-TR',
    timezone        varchar(64)  NOT NULL DEFAULT 'Europe/Istanbul',
    data_residency  varchar(32)  NOT NULL DEFAULT 'eu-west',
    plan            varchar(40)  NOT NULL DEFAULT 'trial'
                    CHECK (plan IN ('trial','starter','growth','enterprise','custom')),
    seats_allowed   int          NOT NULL DEFAULT 50 CHECK (seats_allowed > 0),
    status          varchar(20)  NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','suspended','churned','trial')),
    contact_email   varchar(320),
    contact_phone   varchar(40),
    settings        jsonb        NOT NULL DEFAULT '{}'::jsonb,
    created_at      timestamptz  NOT NULL DEFAULT now(),
    updated_at      timestamptz  NOT NULL DEFAULT now(),
    deleted_at      timestamptz,
    CONSTRAINT uq_tenants_slug UNIQUE (slug)
);

CREATE INDEX idx_tenants_status ON app.tenants(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_tenants_plan   ON app.tenants(plan)   WHERE deleted_at IS NULL;

CREATE TRIGGER trg_tenants_updated_at
    BEFORE UPDATE ON app.tenants
    FOR EACH ROW EXECUTE FUNCTION app.update_updated_at();

COMMENT ON TABLE app.tenants IS 'Root tenant (müşteri şirket) records — tüm verilerin sahibi.';
COMMENT ON COLUMN app.tenants.slug IS 'URL-safe tenant identifier (e.g., acme-tr).';
COMMENT ON COLUMN app.tenants.data_residency IS 'Data residency region (eu-west, tr-central, etc.).';
