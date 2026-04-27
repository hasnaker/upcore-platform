-- 021_mobility.down.sql — rollback mobility tables

SET search_path TO app, public;

DROP TRIGGER IF EXISTS trg_succession_candidates_updated_at ON succession_candidates;
DROP TRIGGER IF EXISTS trg_succession_plans_updated_at ON succession_plans;
DROP TRIGGER IF EXISTS trg_career_paths_updated_at ON career_paths;
DROP TRIGGER IF EXISTS trg_internal_rotations_updated_at ON internal_rotations;

DROP TABLE IF EXISTS succession_candidates CASCADE;
DROP TABLE IF EXISTS succession_plans      CASCADE;
DROP TABLE IF EXISTS career_path_steps     CASCADE;
DROP TABLE IF EXISTS career_paths          CASCADE;
DROP TABLE IF EXISTS internal_rotations    CASCADE;
