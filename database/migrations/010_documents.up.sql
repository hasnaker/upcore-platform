-- =============================================================================
-- 010_documents.up.sql
-- Documents + version history (contracts, payslips, certificates, ...)
-- =============================================================================

CREATE TABLE app.documents (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    owner_employee_id   uuid REFERENCES app.employees(id) ON DELETE CASCADE,
    owner_user_id       uuid REFERENCES app.users(id) ON DELETE SET NULL,
    category            varchar(40) NOT NULL
                        CHECK (category IN ('sözleşme','bordro','kimlik','sertifika','diploma','sağlık_raporu','izin_belgesi','eğitim_belgesi','policy','diğer')),
    title               varchar(300) NOT NULL,
    description         text,
    current_version     int NOT NULL DEFAULT 1 CHECK (current_version >= 1),
    tags                text[] NOT NULL DEFAULT '{}',
    is_confidential     boolean NOT NULL DEFAULT true,
    retention_until     date,                          -- KVKK saklama süresi sonu
    signed_at           timestamptz,
    signed_by           uuid REFERENCES app.users(id) ON DELETE SET NULL,
    metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    deleted_at          timestamptz
);

CREATE INDEX idx_documents_tenant      ON app.documents(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_employee    ON app.documents(owner_employee_id);
CREATE INDEX idx_documents_category    ON app.documents(tenant_id, category);
CREATE INDEX idx_documents_tags        ON app.documents USING gin (tags);
CREATE INDEX idx_documents_title_trgm  ON app.documents USING gin (title gin_trgm_ops);

CREATE TRIGGER trg_documents_updated_at
    BEFORE UPDATE ON app.documents
    FOR EACH ROW EXECUTE FUNCTION app.update_updated_at();

-- ===== Document versions =====================================================
CREATE TABLE app.document_versions (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    document_id       uuid NOT NULL REFERENCES app.documents(id) ON DELETE CASCADE,
    version           int NOT NULL CHECK (version >= 1),
    storage_provider  varchar(30) NOT NULL DEFAULT 'azure_blob',
    storage_container varchar(120) NOT NULL,
    storage_key       text NOT NULL,
    mime_type         varchar(120) NOT NULL,
    size_bytes        bigint NOT NULL CHECK (size_bytes >= 0),
    checksum_sha256   char(64),
    uploaded_by       uuid REFERENCES app.users(id) ON DELETE SET NULL,
    uploaded_at       timestamptz NOT NULL DEFAULT now(),
    notes             text,
    CONSTRAINT uq_document_versions UNIQUE (document_id, version)
);

CREATE INDEX idx_document_versions_tenant   ON app.document_versions(tenant_id);
CREATE INDEX idx_document_versions_document ON app.document_versions(document_id, version DESC);

COMMENT ON TABLE app.documents IS 'Çalışan / kurum dokümanları (sözleşme, bordro, sertifika, vb.).';
COMMENT ON TABLE app.document_versions IS 'Doküman sürüm geçmişi ve depolama referansları.';
COMMENT ON COLUMN app.documents.retention_until IS 'KVKK gereği saklama süresi sonu.';
