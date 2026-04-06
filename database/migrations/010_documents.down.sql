-- =============================================================================
-- 010_documents.down.sql
-- =============================================================================
DROP TABLE IF EXISTS app.document_versions CASCADE;
DROP TRIGGER IF EXISTS trg_documents_updated_at ON app.documents;
DROP TABLE IF EXISTS app.documents CASCADE;
