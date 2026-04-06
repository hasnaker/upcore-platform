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

// Config holds DB connection parameters.
type Config struct {
	DSN         string
	MaxOpenConn int
	MaxIdleConn int
	MaxLifetime time.Duration
}

// Open creates a new sqlx.DB and pings it to verify connectivity.
func Open(ctx context.Context, cfg Config) (*sqlx.DB, error) {
	if cfg.MaxOpenConn <= 0 {
		cfg.MaxOpenConn = 25
	}
	if cfg.MaxIdleConn <= 0 {
		cfg.MaxIdleConn = 5
	}
	if cfg.MaxLifetime <= 0 {
		cfg.MaxLifetime = 30 * time.Minute
	}

	sqldb, err := sqlx.Open("postgres", cfg.DSN)
	if err != nil {
		return nil, fmt.Errorf("open db: %w", err)
	}
	sqldb.SetMaxOpenConns(cfg.MaxOpenConn)
	sqldb.SetMaxIdleConns(cfg.MaxIdleConn)
	sqldb.SetConnMaxLifetime(cfg.MaxLifetime)

	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	if err := sqldb.PingContext(pingCtx); err != nil {
		_ = sqldb.Close()
		return nil, fmt.Errorf("ping db: %w", err)
	}
	return sqldb, nil
}

// Close closes the database connection if non-nil.
func Close(d *sqlx.DB) error {
	if d == nil {
		return nil
	}
	return d.Close()
}

// Execer is a small interface satisfied by *sqlx.DB and *sqlx.Tx.
type Execer interface {
	ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error)
}

// SetRLSTenant sets the tenant ID on the session/transaction for RLS policies.
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
