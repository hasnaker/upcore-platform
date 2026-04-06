-- =============================================================================
-- 006_positions.down.sql
-- =============================================================================
DROP TRIGGER IF EXISTS trg_positions_updated_at ON app.position_definitions;
DROP TABLE IF EXISTS app.position_definitions CASCADE;
