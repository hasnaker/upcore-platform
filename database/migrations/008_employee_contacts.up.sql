-- =============================================================================
-- 008_employee_contacts.up.sql
-- Emergency contacts and dependents
-- =============================================================================

CREATE TABLE app.employee_contacts (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    employee_id       uuid NOT NULL REFERENCES app.employees(id) ON DELETE CASCADE,
    contact_type      varchar(30) NOT NULL DEFAULT 'emergency'
                      CHECK (contact_type IN ('emergency','next_of_kin','guardian','partner','other')),
    full_name         varchar(200) NOT NULL,
    relationship      varchar(60)                            -- ilişki: eş, anne, baba, kardeş
                      CHECK (relationship IS NULL OR relationship IN ('eş','anne','baba','kardeş','çocuk','arkadaş','diğer')),
    phone_primary     varchar(40) NOT NULL,
    phone_secondary   varchar(40),
    email             citext,
    address           text,
    notes             text,
    is_primary        boolean NOT NULL DEFAULT false,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    deleted_at        timestamptz
);

CREATE INDEX idx_employee_contacts_employee ON app.employee_contacts(employee_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_employee_contacts_tenant   ON app.employee_contacts(tenant_id);
CREATE UNIQUE INDEX uq_employee_contacts_primary
    ON app.employee_contacts(employee_id)
    WHERE is_primary = true AND deleted_at IS NULL;

CREATE TRIGGER trg_employee_contacts_updated_at
    BEFORE UPDATE ON app.employee_contacts
    FOR EACH ROW EXECUTE FUNCTION app.update_updated_at();

-- ===== Dependents (bakmakla yükümlü) =========================================
CREATE TABLE app.employee_dependents (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    employee_id    uuid NOT NULL REFERENCES app.employees(id) ON DELETE CASCADE,
    full_name      varchar(200) NOT NULL,
    relationship   varchar(40) NOT NULL
                   CHECK (relationship IN ('eş','çocuk','anne','baba','kardeş','diğer')),
    birth_date     date,
    tckn           varchar(11),
    is_in_scope    boolean NOT NULL DEFAULT true,       -- bakmakla yükümlü mü
    notes          text,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now(),
    deleted_at     timestamptz,
    CONSTRAINT chk_dependents_tckn CHECK (tckn IS NULL OR app.is_valid_tckn(tckn))
);

CREATE INDEX idx_employee_dependents_employee ON app.employee_dependents(employee_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_employee_dependents_tenant   ON app.employee_dependents(tenant_id);

CREATE TRIGGER trg_employee_dependents_updated_at
    BEFORE UPDATE ON app.employee_dependents
    FOR EACH ROW EXECUTE FUNCTION app.update_updated_at();

COMMENT ON TABLE app.employee_contacts IS 'Acil durum / yakın kişi iletişim bilgileri.';
COMMENT ON TABLE app.employee_dependents IS 'Çalışanın bakmakla yükümlü olduğu kişiler (AGİ, sigorta için).';
