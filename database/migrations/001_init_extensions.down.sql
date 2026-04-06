-- =============================================================================
-- 001_init_extensions.down.sql
-- =============================================================================
DROP FUNCTION IF EXISTS app.is_valid_tckn(text);
DROP FUNCTION IF EXISTS app.immutable_row();
DROP FUNCTION IF EXISTS app.update_updated_at();
DROP FUNCTION IF EXISTS app.current_tenant_id();

DROP SCHEMA IF EXISTS ml CASCADE;
DROP SCHEMA IF EXISTS audit CASCADE;
DROP SCHEMA IF EXISTS app CASCADE;

-- Extensions are not dropped: they may be used by other databases on the cluster.
