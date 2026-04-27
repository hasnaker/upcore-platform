-- 034_tenant_branding.up.sql
-- Tenant-level white-label: logo + renk teması + email footer.
-- White-label değerleri public (login page tenant subdomain'inden okunur),
-- dolayısıyla RLS policy açık — herkes kendi tenant'ının brandingine erişir.

CREATE TABLE IF NOT EXISTS app.tenant_branding (
    tenant_id       uuid PRIMARY KEY REFERENCES app.tenants(id) ON DELETE CASCADE,
    logo_url        text,                               -- Azure Blob public URL
    logo_dark_url   text,                               -- dark-mode variant
    primary_color   varchar(7),                         -- #RRGGBB
    accent_color    varchar(7),
    favicon_url     text,
    email_footer    text,                               -- HTML, inline safe
    custom_domain   varchar(255),                       -- ör. ik.acme.com
    custom_css      text,                               -- opsiyonel dar kapsamlı
    support_email   varchar(255),
    support_phone   varchar(50),
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE app.tenant_branding ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_branding_rls ON app.tenant_branding
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

COMMENT ON TABLE app.tenant_branding IS 'White-label ayarları: tenant logo, renk, domain, email footer';
COMMENT ON COLUMN app.tenant_branding.custom_css IS 'Sadece auth domain''lerine özel — XSS riski taşır, sanitize edin';
