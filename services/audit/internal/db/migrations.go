package db

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/jmoiron/sqlx"
	"github.com/rs/zerolog/log"
)

// RunMigrations applies all *.up.sql files found in the directory, in
// lexicographic order, in a single transaction per file. It is idempotent:
// each migration starts with `CREATE TABLE IF NOT EXISTS` or `CREATE OR REPLACE`.
func RunMigrations(ctx context.Context, db *sqlx.DB, dir string) error {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return fmt.Errorf("read migrations dir: %w", err)
	}
	var files []string
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		name := e.Name()
		if strings.HasSuffix(name, ".up.sql") || (strings.HasSuffix(name, ".sql") && !strings.HasSuffix(name, ".down.sql")) {
			files = append(files, name)
		}
	}
	sort.Strings(files)

	for _, f := range files {
		content, err := os.ReadFile(filepath.Join(dir, f))
		if err != nil {
			return fmt.Errorf("read %s: %w", f, err)
		}
		if _, err := db.ExecContext(ctx, string(content)); err != nil {
			return fmt.Errorf("apply %s: %w", f, err)
		}
		log.Info().Str("file", f).Msg("migration applied")
	}
	return nil
}
