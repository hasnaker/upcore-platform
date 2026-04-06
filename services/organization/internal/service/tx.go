package service

import (
	"context"
	"fmt"

	"github.com/jmoiron/sqlx"

	"github.com/upcore/organization/internal/repository"
)

// TxRunner abstracts transaction execution.
type TxRunner interface {
	RunInTx(ctx context.Context, fn func(tx repository.Querier) error) error
}

// SQLTxRunner runs fn inside a real sqlx transaction.
type SQLTxRunner struct{ DB *sqlx.DB }

// RunInTx opens a transaction, commits on success, rolls back on error.
func (r *SQLTxRunner) RunInTx(ctx context.Context, fn func(tx repository.Querier) error) error {
	tx, err := r.DB.BeginTxx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	if err := fn(tx); err != nil {
		_ = tx.Rollback()
		return err
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit tx: %w", err)
	}
	return nil
}

// NoopTxRunner invokes fn with a nil Querier — callers must handle nil.
type NoopTxRunner struct{}

// RunInTx calls fn directly with nil.
func (NoopTxRunner) RunInTx(_ context.Context, fn func(tx repository.Querier) error) error {
	return fn(nil)
}
