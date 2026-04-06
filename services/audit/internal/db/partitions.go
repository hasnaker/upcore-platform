package db

import (
	"context"
	"fmt"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/rs/zerolog/log"
)

// EnsurePartitions creates monthly partitions for the next `monthsAhead`
// months for a PostgreSQL range-partitioned table. Partition naming is
// <table>_YYYY_MM. Safe to call repeatedly; uses IF NOT EXISTS.
//
// Expects a parent table that is already PARTITION BY RANGE (occurred_at) or
// the configured time column.
func EnsurePartitions(ctx context.Context, db *sqlx.DB, table string, monthsAhead int) error {
	if monthsAhead < 1 {
		monthsAhead = 1
	}
	now := time.Now().UTC()
	// Start from current month-start.
	start := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)

	for i := 0; i <= monthsAhead; i++ {
		from := start.AddDate(0, i, 0)
		to := from.AddDate(0, 1, 0)
		partName := fmt.Sprintf("%s_%04d_%02d", stripSchemaPrefix(table), from.Year(), from.Month())
		// Keep partitions under the same schema (default: "audit").
		schema := schemaOf(table)
		fullPart := fmt.Sprintf("%s.%s", schema, partName)

		stmt := fmt.Sprintf(
			`CREATE TABLE IF NOT EXISTS %s PARTITION OF %s FOR VALUES FROM ('%s') TO ('%s');`,
			fullPart, table, from.Format("2006-01-02"), to.Format("2006-01-02"),
		)
		if _, err := db.ExecContext(ctx, stmt); err != nil {
			return fmt.Errorf("create partition %s: %w", fullPart, err)
		}
		log.Debug().Str("partition", fullPart).Msg("partition ensured")
	}
	return nil
}

// DropOldPartitions detaches and drops partitions older than retentionMonths.
// Only touches partitions matching the `<table>_YYYY_MM` naming convention.
func DropOldPartitions(ctx context.Context, db *sqlx.DB, table string, retentionMonths int) error {
	if retentionMonths <= 0 {
		return nil
	}
	schema := schemaOf(table)
	base := stripSchemaPrefix(table)
	cutoff := time.Now().UTC().AddDate(0, -retentionMonths, 0)

	// Find candidate partitions.
	var partitions []string
	q := `
		SELECT c.relname
		FROM pg_inherits i
		JOIN pg_class p ON p.oid = i.inhparent
		JOIN pg_class c ON c.oid = i.inhrelid
		JOIN pg_namespace n ON n.oid = c.relnamespace
		WHERE n.nspname = $1
		  AND p.relname = $2
		ORDER BY c.relname
	`
	if err := db.SelectContext(ctx, &partitions, q, schema, base); err != nil {
		return fmt.Errorf("list partitions: %w", err)
	}

	for _, part := range partitions {
		var year, month int
		if _, err := fmt.Sscanf(part, base+"_%04d_%02d", &year, &month); err != nil {
			continue // Not our naming scheme.
		}
		partDate := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
		if partDate.Before(cutoff) {
			full := fmt.Sprintf("%s.%s", schema, part)
			if _, err := db.ExecContext(ctx, fmt.Sprintf("DROP TABLE IF EXISTS %s", full)); err != nil {
				return fmt.Errorf("drop partition %s: %w", full, err)
			}
			log.Info().Str("partition", full).Msg("old partition dropped")
		}
	}
	return nil
}

// RunPartitionMaintenance runs a loop that ensures future partitions exist
// and drops old ones; fires every 6 hours plus once immediately.
func RunPartitionMaintenance(ctx context.Context, db *sqlx.DB, tables []string, monthsAhead, retentionMonths int) {
	maintain := func() {
		for _, t := range tables {
			if err := EnsurePartitions(ctx, db, t, monthsAhead); err != nil {
				log.Error().Err(err).Str("table", t).Msg("ensure partitions failed")
			}
			if retentionMonths > 0 {
				if err := DropOldPartitions(ctx, db, t, retentionMonths); err != nil {
					log.Error().Err(err).Str("table", t).Msg("drop old partitions failed")
				}
			}
		}
	}
	maintain()

	ticker := time.NewTicker(6 * time.Hour)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			maintain()
		}
	}
}

func schemaOf(table string) string {
	for i := 0; i < len(table); i++ {
		if table[i] == '.' {
			return table[:i]
		}
	}
	return "public"
}

func stripSchemaPrefix(table string) string {
	for i := 0; i < len(table); i++ {
		if table[i] == '.' {
			return table[i+1:]
		}
	}
	return table
}
