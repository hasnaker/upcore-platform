-- 004_rbac_rules.down.sql
DELETE FROM rbac_policies WHERE tenant_id IS NULL;
DELETE FROM roles WHERE is_system = TRUE AND tenant_id IS NULL;
