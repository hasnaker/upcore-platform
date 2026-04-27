-- 047_feature_flags_groups.down.sql
ALTER TABLE app.employees DROP COLUMN IF EXISTS company_group_id;
DROP TABLE IF EXISTS app.company_groups;
DROP TABLE IF EXISTS app.feature_flags;
