// Package db handles PostgreSQL connection setup and SQL constants.
package db

import (
	"context"
	"fmt"
	"time"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq" // PostgreSQL driver
)

// Config holds database connection parameters.
type Config struct {
	DSN         string
	MaxOpenConn int
	MaxIdleConn int
}

// Open creates and pings a sqlx.DB connection pool.
func Open(ctx context.Context, cfg Config) (*sqlx.DB, error) {
	db, err := sqlx.ConnectContext(ctx, "postgres", cfg.DSN)
	if err != nil {
		return nil, fmt.Errorf("connect db: %w", err)
	}
	db.SetMaxOpenConns(cfg.MaxOpenConn)
	db.SetMaxIdleConns(cfg.MaxIdleConn)
	db.SetConnMaxLifetime(15 * time.Minute)
	db.SetConnMaxIdleTime(5 * time.Minute)

	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	if err := db.PingContext(pingCtx); err != nil {
		return nil, fmt.Errorf("ping db: %w", err)
	}
	return db, nil
}

// Close closes the database connection pool.
func Close(db *sqlx.DB) error {
	if db == nil {
		return nil
	}
	return db.Close()
}
