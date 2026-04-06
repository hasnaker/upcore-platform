-- =============================================================================
-- 011_positions_candidates.down.sql
-- =============================================================================
DROP TRIGGER IF EXISTS trg_applications_updated_at ON app.applications;
DROP TABLE IF EXISTS app.applications CASCADE;
DROP TRIGGER IF EXISTS trg_candidates_updated_at ON app.candidates;
DROP TABLE IF EXISTS app.candidates CASCADE;
DROP TRIGGER IF EXISTS trg_open_positions_updated_at ON app.open_positions;
DROP TABLE IF EXISTS app.open_positions CASCADE;
