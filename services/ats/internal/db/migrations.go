package db

import (
	"context"
	"embed"
	"fmt"

	"github.com/jmoiron/sqlx"
)

// Migrations holds the embedded SQL migration files.
// In production, use golang-migrate or similar.
// This is a placeholder for the migration runner.

// RunMigrations applies embedded SQL files in order.
// For production, replace with golang-migrate/migrate integration.
func RunMigrations(ctx context.Context, db *sqlx.DB, files embed.FS) error {
	entries, err := files.ReadDir(".")
	if err != nil {
		return fmt.Errorf("read migrations dir: %w", err)
	}
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		sql, err := files.ReadFile(entry.Name())
		if err != nil {
			return fmt.Errorf("read migration %s: %w", entry.Name(), err)
		}
		if _, err := db.ExecContext(ctx, string(sql)); err != nil {
			return fmt.Errorf("exec migration %s: %w", entry.Name(), err)
		}
	}
	return nil
}
