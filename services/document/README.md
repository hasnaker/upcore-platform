# document-service

Upcore document microservice. Manages document storage on Azure Blob Storage
with versioning, Turkish e-imza (e-signature) flow, KVKK-compliant retention,
and expiring-document alerts.

## Stack
- Go 1.23, Chi, sqlx, PostgreSQL 16
- Azure Blob Storage SDK (`azblob`)
- Port 8006

## Endpoints
```
GET    /api/v1/documents                               # list
GET    /api/v1/documents/:id                           # get metadata
POST   /api/v1/documents                               # upload (multipart)
PATCH  /api/v1/documents/:id                           # update metadata
DELETE /api/v1/documents/:id                           # soft-delete
GET    /api/v1/documents/:id/download                  # 302 → SAS URL
GET    /api/v1/documents/:id/versions                  # list versions
POST   /api/v1/documents/:id/versions                  # new version (multipart)
GET    /api/v1/documents/:id/versions/:v/download      # specific version
POST   /api/v1/documents/:id/versions/:v/restore       # restore version
POST   /api/v1/documents/:id/signature                 # initiate e-signature
GET    /api/v1/documents/:id/signature/status          # status
DELETE /api/v1/signatures/:id                          # cancel signature
GET    /api/v1/documents/expiring                      # expiring in N days
POST   /api/v1/documents/expiring/notify               # trigger expiry events
GET    /health, /ready
```

## Local development
```bash
cp .env.example .env
make run
# or
go run ./cmd
```

Without Azure credentials the service falls back to an in-memory blob store
so handlers and tests work end-to-end.

## Validation
```bash
go mod tidy
go build ./...
go test ./...
```

## KVKK compliance notes
- Default retention windows set per document type (7 years for contracts,
  10 years for medical reports, etc.) and stored in `documents.retention_until`.
- Every download emits `document.downloaded.v1` for audit trail.
- Soft-delete marks `deleted_at`; hard-delete runs after retention window.
- Max upload 50MB, MIME allow-list (PDF / DOCX / XLSX / JPG / PNG / TIFF).
- SHA-256 checksum computed on every upload.
