package repository

import (
	"database/sql"
	"errors"

	"github.com/upcore/mobility/internal/domain"
)

// mapSQLErr translates stdlib/pq errors into domain sentinels.
func mapSQLErr(err error) error {
	if err == nil {
		return nil
	}
	if errors.Is(err, sql.ErrNoRows) {
		return domain.ErrNotFound
	}
	return err
}

// sqlNoRows returns the sentinel for "no rows" so tests and repos avoid
// importing database/sql just for errors.Is checks.
func sqlNoRows() error { return sql.ErrNoRows }
