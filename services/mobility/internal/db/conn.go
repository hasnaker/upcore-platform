// Package db handles PostgreSQL connection + RLS helpers.
package db

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq" // pq driver
)

// Config bundles connection settings for Open.
type Config struct {
	DSN         string
	MaxOpenConn int
	MaxIdleConn int
}

// Open returns a ready-to-use sqlx connection with sensible pool settings.
func Open(ctx context.Context, cfg Config) (*sqlx.DB, error) {
	db, err := sqlx.Open("postgres", cfg.DSN)
	if err != nil {
		return nil, fmt.Errorf("sqlx open: %w", err)
	}

	if cfg.MaxOpenConn > 0 {
		db.SetMaxOpenConns(cfg.MaxOpenConn)
	}
	if cfg.MaxIdleConn > 0 {
		db.SetMaxIdleConns(cfg.MaxIdleConn)
	}
	db.SetConnMaxLifetime(5 * time.Minute)

	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	if err := db.PingContext(pingCtx); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("ping: %w", err)
	}
	return db, nil
}

// Close releases the pool.
func Close(db *sqlx.DB) error {
	if db == nil {
		return nil
	}
	return db.Close()
}

// Execer is the minimal exec contract for RLS helpers.
type Execer interface {
	ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error)
}

// SetRLSTenant sets the tenant ID on the session/transaction for RLS policies.
// Call inside a transaction for safety (third arg `true` = local-scoped).
func SetRLSTenant(ctx context.Context, e Execer, tenantID uuid.UUID) error {
	if tenantID == uuid.Nil {
		return fmt.Errorf("rls: tenant id is nil")
	}
	_, err := e.ExecContext(ctx, "SELECT set_config('app.tenant_id', $1, true)", tenantID.String())
	if err != nil {
		return fmt.Errorf("set rls tenant: %w", err)
	}
	return nil
}
