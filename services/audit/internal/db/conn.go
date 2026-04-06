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

// Connect opens a sqlx connection pool with default parameters.
func Connect(dsn string) (*sqlx.DB, error) {
	return ConnectWithOpts(dsn, 50, 10, 5*time.Minute)
}

// ConnectWithOpts opens a sqlx connection with configurable pool options.
func ConnectWithOpts(dsn string, maxOpen, maxIdle int, maxLifetime time.Duration) (*sqlx.DB, error) {
	db, err := sqlx.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("open postgres: %w", err)
	}
	db.SetMaxOpenConns(maxOpen)
	db.SetMaxIdleConns(maxIdle)
	db.SetConnMaxLifetime(maxLifetime)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := db.PingContext(ctx); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("ping postgres: %w", err)
	}
	return db, nil
}

// SetTenantRLS sets the current transaction's `app.tenant_id` GUC so that RLS
// policies filter data by tenant.
func SetTenantRLS(ctx context.Context, tx *sqlx.Tx, tenantID uuid.UUID) error {
	_, err := tx.ExecContext(ctx, "SELECT set_config('app.tenant_id', $1, true)", tenantID.String())
	if err != nil {
		return fmt.Errorf("set tenant rls: %w", err)
	}
	return nil
}

// SetTenantRLSOnConn sets tenant GUC on a raw sql.Conn.
func SetTenantRLSOnConn(ctx context.Context, conn *sql.Conn, tenantID uuid.UUID) error {
	_, err := conn.ExecContext(ctx, "SELECT set_config('app.tenant_id', $1, false)", tenantID.String())
	return err
}
