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

// RunMigrations applies all .sql files from the given directory in lexicographic
// order. Each file is executed as a single statement batch.
func RunMigrations(ctx context.Context, db *sqlx.DB, dir string) error {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return fmt.Errorf("read migrations dir: %w", err)
	}

	var files []string
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".sql") {
			continue
		}
		files = append(files, e.Name())
	}
	sort.Strings(files)

	for _, f := range files {
		path := filepath.Join(dir, f)
		data, err := os.ReadFile(path)
		if err != nil {
			return fmt.Errorf("read migration %s: %w", f, err)
		}
		sql := strings.TrimSpace(string(data))
		if sql == "" {
			continue
		}
		if _, err := db.ExecContext(ctx, sql); err != nil {
			return fmt.Errorf("exec migration %s: %w", f, err)
		}
		log.Info().Str("file", f).Msg("migration applied")
	}
	return nil
}
