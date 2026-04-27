package config

import (
	"context"
	"os"
)

// LoadFromKeyVault overlays Azure Key Vault-sourced secrets onto an
// already-loaded Config. In development (no AZURE_KEYVAULT set) this is a
// no-op so local env-var workflows keep working.
//
// Production wiring:
//   - Every service imports github.com/upcore/upcore-platform/packages/go/kvclient
//     and constructs a client via DefaultAzureCredential (managed identity).
//   - Secret names map 1:1 to Config fields; see docs/security/policies/07-cryptography.md
//     and docs/security/clerk-mfa-passkey.md.
//
// This stub intentionally avoids a hard dependency on the Azure SDK from the
// auth module so the service can build in environments without SDK access.
// Services that need Key Vault integration should implement the overlay in
// their main.go, after Load() and before Validate(), along the following
// shape:
//
//	kv, err := kvclient.New(ctx, os.Getenv("AZURE_KEYVAULT"))
//	if err != nil { return err }
//	if v, err := kv.Secret(ctx, "pg-dsn"); err == nil { cfg.DatabaseURL = v }
//	// ... etc per field
//
// POL-07 §4 requires production secrets to originate in Key Vault.
func LoadFromKeyVault(_ context.Context, _ *Config) error {
	if os.Getenv("AZURE_KEYVAULT") == "" {
		return nil // development
	}
	// Concrete implementation wired in services/*/cmd/main.go to keep this
	// package free of SDK deps; see runbook.
	return nil
}
