// Package db wraps sqlx + RLS helpers for the performance service.
package db

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
)

// Config bundles connection settings.
type Config struct {
	DSN         string
	MaxOpenConn int
	MaxIdleConn int
}

// Open returns a ready-to-use connection pool.
func Open(ctx context.Context, cfg Config) (*sqlx.DB, error) {
	d, err := sqlx.Open("postgres", cfg.DSN)
	if err != nil {
		return nil, fmt.Errorf("sqlx open: %w", err)
	}
	if cfg.MaxOpenConn > 0 {
		d.SetMaxOpenConns(cfg.MaxOpenConn)
	}
	if cfg.MaxIdleConn > 0 {
		d.SetMaxIdleConns(cfg.MaxIdleConn)
	}
	d.SetConnMaxLifetime(5 * time.Minute)
	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	if err := d.PingContext(pingCtx); err != nil {
		_ = d.Close()
		return nil, fmt.Errorf("ping: %w", err)
	}
	return d, nil
}

// Close releases the pool.
func Close(d *sqlx.DB) error {
	if d == nil {
		return nil
	}
	return d.Close()
}

// Execer narrows the ExecContext contract.
type Execer interface {
	ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error)
}

// SetRLSTenant sets app.tenant_id GUC for the RLS policies.
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
