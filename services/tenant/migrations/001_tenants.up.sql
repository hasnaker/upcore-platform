-- Tenants: root organization records.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS tenants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(200) NOT NULL,
    slug            VARCHAR(60)  NOT NULL UNIQUE,
    vkn             VARCHAR(10),
    tckn            VARCHAR(11),
    country         VARCHAR(2)   NOT NULL DEFAULT 'TR',
    locale          VARCHAR(10)  NOT NULL DEFAULT 'tr-TR',
    status          VARCHAR(20)  NOT NULL DEFAULT 'trial'
        CHECK (status IN ('trial','active','suspended','deleted')),
    trial_ends_at   TIMESTAMPTZ,
    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenants_slug_active ON tenants(slug) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tenants_status      ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_deleted_at  ON tenants(deleted_at) WHERE deleted_at IS NOT NULL;
