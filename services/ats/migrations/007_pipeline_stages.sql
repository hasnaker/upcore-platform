-- 007_pipeline_stages.sql
-- Create pipeline_stages table for customizable kanban boards.

CREATE TABLE IF NOT EXISTS app.pipeline_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    order_index INT NOT NULL DEFAULT 0,
    color VARCHAR(20),
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    is_terminal BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_pipeline_stages_tenant ON app.pipeline_stages (tenant_id, order_index);
