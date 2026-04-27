# kvclient — Azure Key Vault helper for UpCore Go services

Managed-identity-first secret fetcher with TTL cache. Use from every Go
service; do not read long-lived secrets from environment variables in
production (POL-07).

## Usage

```go
kv, err := kvclient.New(ctx, "kv-upcore-prod")
if err != nil {
    return err
}

dsn, err := kv.Secret(ctx, "pg-dsn")
if err != nil {
    return err
}

db, err := sqlx.Open("pgx", dsn)
```

During local dev, `DefaultAzureCredential` falls back to `az login` or
`AZURE_CLIENT_ID`/`AZURE_CLIENT_SECRET` env. Integration with each service
config lives in `services/*/internal/config/config.go` — see `keyvault.go`
next to it.
