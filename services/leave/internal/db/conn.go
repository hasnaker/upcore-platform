package db

import (
	"context"
	"fmt"
	"time"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq" // postgres driver
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
func Close(db *sqlx.DB) error {
	if db == nil {
		return nil
	}
	return db.Close()
}
