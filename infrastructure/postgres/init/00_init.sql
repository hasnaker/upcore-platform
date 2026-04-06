-- =============================================================================
-- Upcore - PostgreSQL bootstrap script (runs once on first container start)
-- =============================================================================
-- Creates helper roles used by migrations and RLS policies.
-- =============================================================================

-- Application role used by API/worker services (subject to RLS)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'upcore_app') THEN
        CREATE ROLE upcore_app LOGIN PASSWORD 'upcore_app_dev';
    END IF;
END$$;

-- Admin role used by migrations (bypasses RLS)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'upcore_admin') THEN
        CREATE ROLE upcore_admin LOGIN PASSWORD 'upcore_admin_dev' BYPASSRLS;
    END IF;
END$$;

GRANT CONNECT ON DATABASE upcore_dev TO upcore_app, upcore_admin;
