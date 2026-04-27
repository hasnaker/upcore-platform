-- 048_saml_connections.up.sql
-- Tenant self-service SAML connections: IdP metadata + cert storage.
-- Clerk ile eşzamanlı; bu tablo "pending config" kaynağı, gateway
-- middleware'i burayı okuyup IdP'ye redirect eder.

CREATE TABLE IF NOT EXISTS app.saml_connections (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           uuid NOT NULL UNIQUE,
    idp_name            varchar(100) NOT NULL,      -- "Azure AD" / "Okta" / "Google Workspace"
    entity_id           text NOT NULL,              -- IdP entity ID
    sso_url             text NOT NULL,              -- IdP SSO endpoint
    certificate         text NOT NULL,              -- X.509 PEM
    metadata_xml        text,                       -- ham metadata (opsiyonel)
    email_domain        varchar(200) NOT NULL,      -- "acme.com" — otomatik redirect
    attribute_map       jsonb NOT NULL DEFAULT '{}',-- {"email": "user.mail", "firstName": "user.givenname"}
    group_role_map      jsonb NOT NULL DEFAULT '{}',-- {"upcore-admins": "admin", "upcore-hr": "hr_admin"}
    status              varchar(20) NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft','testing','active','suspended')),
    last_test_at        timestamptz,
    last_test_result    varchar(20),
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saml_connections_domain
    ON app.saml_connections (email_domain)
    WHERE status = 'active';

ALTER TABLE app.saml_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY saml_connections_rls ON app.saml_connections
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

COMMENT ON TABLE app.saml_connections IS 'Tenant-level SAML IdP config — Clerk Enterprise connection mirror';
COMMENT ON COLUMN app.saml_connections.group_role_map IS 'IdP group claim → UpCore role mapping: {"group_name":"role"}';
