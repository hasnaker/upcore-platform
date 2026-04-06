-- =============================================================================
-- 017_mobility.down.sql
-- =============================================================================
DROP TRIGGER IF EXISTS trg_mobility_requests_updated_at ON app.mobility_requests;
DROP TABLE IF EXISTS app.mobility_requests CASCADE;
DROP TRIGGER IF EXISTS trg_career_paths_updated_at ON app.career_paths;
DROP TABLE IF EXISTS app.career_paths CASCADE;
DROP TRIGGER IF EXISTS trg_internal_positions_updated_at ON app.internal_positions;
DROP TABLE IF EXISTS app.internal_positions CASCADE;
