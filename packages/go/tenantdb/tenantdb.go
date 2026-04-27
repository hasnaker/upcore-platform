// Package tenantdb is the pgx-flavoured companion of packages/go/rlsctx.
//
// Where rlsctx pins a sqlx connection per request and sets session-scoped
// GUCs (app.tenant_id, app.user_id), tenantdb exposes the transaction-scoped
// equivalent that is required by migration 062's strict
// app.current_tenant_id() function. Every tenant-touching code path must
// either:
//
//  1. Open a Pool connection, issue `SET LOCAL app.tenant_id`, run the
//     queries, then release — i.e. call BeginTenantTx.
//  2. Reuse the rlsctx middleware if the service is already sqlx-based.
//
// Both paths satisfy the RLS guard introduced in 062_security_hardening.up.sql.
//
// # Why two packages?
//
// Most UpCore Go services are wired on sqlx + lib/pq. A few newer services
// (billing, status-page, the outbox publisher) are pgx-native so they can use
// LISTEN/NOTIFY and the pgx batch API. tenantdb gives those services a
// middleware-free way to run tenant-scoped SQL and to bolt optimistic locking
// retries on top.
//
// Usage (handler layer):
//
//	tx, err := tdb.BeginTenantTx(ctx, tenantID, userID)
//	if err != nil { return err }
//	defer tx.Rollback(ctx)
//	if _, err := tx.Exec(ctx,
//	    `UPDATE app.okrs SET progress = $1, version = version + 1
//	       WHERE id = $2 AND tenant_id = $3 AND version = $4`,
//	    progress, okrID, tenantID, expectedVersion); err != nil {
//	    return err
//	}
//	return tx.Commit(ctx)
//
// Usage (optimistic retry helper):
//
//	err := tdb.WithOptimisticRetry(ctx, tenantID, userID, func(tx pgx.Tx) error {
//	    return repo.UpdateOKR(ctx, tx, okrID, progress)
//	})
//	// returns ErrVersionConflict after MaxAttempts.
package tenantdb

import (
	"context"
	"errors"
	"fmt"
	"math/rand"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ErrVersionConflict is returned by helpers that detect a compare-and-set
// miss on a version-guarded UPDATE. Handlers should translate this into
// HTTP 409 with the Turkish body "Yenileyin ve tekrar deneyin".
var ErrVersionConflict = errors.New("tenantdb: optimistic lock version conflict")

// ErrTenantRequired is returned when BeginTenantTx is called with uuid.Nil.
var ErrTenantRequired = errors.New("tenantdb: tenant id is required")

// DefaultMaxAttempts is used when Options.MaxAttempts is not set.
// Three attempts is the sweet spot: it absorbs 2 transient conflicts without
// turning contended rows into a livelock.
const DefaultMaxAttempts = 3

// Pool is the minimum pgxpool surface needed by tenantdb. The concrete
// *pgxpool.Pool from jackc/pgx/v5 satisfies it; tests can pass a fake.
type Pool interface {
	BeginTx(ctx context.Context, txOptions pgx.TxOptions) (pgx.Tx, error)
}

// TenantDB wraps a pgx pool and issues SET LOCAL app.tenant_id / app.user_id
// at the start of every tenant-scoped transaction. It is safe for concurrent
// use.
type TenantDB struct {
	pool Pool
	// MaxAttempts is the default retry count used by WithOptimisticRetry
	// when Options.MaxAttempts is zero.
	MaxAttempts int
	// rng lets tests inject a deterministic random source for backoff jitter.
	rng *rand.Rand
}

// New wraps an existing *pgxpool.Pool.
func New(pool *pgxpool.Pool) *TenantDB {
	return NewFromPool(pool)
}

// NewFromPool wraps any type satisfying the Pool interface. Useful for tests
// that stub out pgxpool.
func NewFromPool(pool Pool) *TenantDB {
	return &TenantDB{
		pool:        pool,
		MaxAttempts: DefaultMaxAttempts,
		//nolint:gosec // non-crypto use: backoff jitter only.
		rng: rand.New(rand.NewSource(time.Now().UnixNano())),
	}
}

// BeginTenantTx opens a pgx transaction and immediately issues
// `SET LOCAL app.tenant_id = <uuid>` (plus app.user_id when non-nil).
// The returned tx MUST be completed by the caller with Commit or Rollback.
//
// Failure modes:
//   - tenantID == uuid.Nil -> ErrTenantRequired (no DB round-trip).
//   - Pool.BeginTx failure -> error wrapped with BeginTx context.
//   - SET LOCAL failure -> the tx is rolled back before returning.
func (t *TenantDB) BeginTenantTx(ctx context.Context, tenantID, userID uuid.UUID) (pgx.Tx, error) {
	if tenantID == uuid.Nil {
		return nil, ErrTenantRequired
	}
	tx, err := t.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, fmt.Errorf("tenantdb: begin tx: %w", err)
	}
	// Use SET LOCAL with set_config to avoid SQL-injection risk from the uuid
	// literal interpolation. set_config('app.tenant_id', '<uuid>', true)
	// mirrors SET LOCAL; `true` = local to this transaction.
	if _, err := tx.Exec(ctx,
		"SELECT set_config('app.tenant_id', $1, true)", tenantID.String()); err != nil {
		_ = tx.Rollback(ctx)
		return nil, fmt.Errorf("tenantdb: set app.tenant_id: %w", err)
	}
	if userID != uuid.Nil {
		if _, err := tx.Exec(ctx,
			"SELECT set_config('app.user_id', $1, true)", userID.String()); err != nil {
			_ = tx.Rollback(ctx)
			return nil, fmt.Errorf("tenantdb: set app.user_id: %w", err)
		}
	}
	return tx, nil
}

// RetryOptions tunes WithOptimisticRetry.
type RetryOptions struct {
	// MaxAttempts caps the number of attempts. Zero falls back to DefaultMaxAttempts.
	MaxAttempts int
	// BaseBackoff is the first sleep; each retry multiplies by 2 up to MaxBackoff.
	BaseBackoff time.Duration
	// MaxBackoff clamps the exponential backoff ceiling.
	MaxBackoff time.Duration
	// Classifier lets callers classify repository-specific errors as retryable
	// conflicts. When nil, only ErrVersionConflict is retried.
	Classifier func(err error) (isConflict bool)
}

// WithOptimisticRetry runs fn inside a fresh tenant tx and retries the whole
// closure on ErrVersionConflict (or any error flagged by opts.Classifier).
// The exponential backoff is 25ms -> 50ms -> 100ms (plus jitter) by default.
//
// fn is responsible for performing its own compare-and-set UPDATE (e.g.
// `UPDATE ... SET ..., version = version + 1 WHERE id = $1 AND version = $2`)
// and returning ErrVersionConflict when RowsAffected() == 0. Callers should
// fetch the current version OUTSIDE fn and pass it in via closure.
//
// If fn returns a non-conflict error the tx is rolled back and the error is
// propagated immediately without retry. On success the tx is committed.
func (t *TenantDB) WithOptimisticRetry(
	ctx context.Context,
	tenantID, userID uuid.UUID,
	opts RetryOptions,
	fn func(tx pgx.Tx) error,
) error {
	maxAttempts := opts.MaxAttempts
	if maxAttempts <= 0 {
		maxAttempts = t.MaxAttempts
	}
	if maxAttempts <= 0 {
		maxAttempts = DefaultMaxAttempts
	}
	base := opts.BaseBackoff
	if base <= 0 {
		base = 25 * time.Millisecond
	}
	maxBackoff := opts.MaxBackoff
	if maxBackoff <= 0 {
		maxBackoff = 500 * time.Millisecond
	}
	classifier := opts.Classifier
	if classifier == nil {
		classifier = defaultConflictClassifier
	}

	var lastErr error
	for attempt := 0; attempt < maxAttempts; attempt++ {
		if err := ctx.Err(); err != nil {
			return err
		}
		tx, err := t.BeginTenantTx(ctx, tenantID, userID)
		if err != nil {
			return err
		}
		err = fn(tx)
		if err != nil {
			_ = tx.Rollback(ctx)
			if !classifier(err) {
				return err
			}
			lastErr = err
		} else {
			if cerr := tx.Commit(ctx); cerr == nil {
				return nil
			} else if !classifier(cerr) {
				return cerr
			} else {
				lastErr = cerr
			}
		}

		// Exponential backoff with full jitter.
		if attempt+1 < maxAttempts {
			d := base << attempt
			if d > maxBackoff {
				d = maxBackoff
			}
			// Jitter in [0.5*d, 1.5*d).
			jitter := time.Duration(t.rng.Int63n(int64(d)))
			sleep := d/2 + jitter
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(sleep):
			}
		}
	}
	if lastErr == nil {
		lastErr = ErrVersionConflict
	}
	return fmt.Errorf("tenantdb: giving up after %d attempts: %w", maxAttempts, lastErr)
}

// defaultConflictClassifier flags only ErrVersionConflict as retryable.
func defaultConflictClassifier(err error) bool {
	return errors.Is(err, ErrVersionConflict)
}

// CheckedUpdate helps repositories convert a pgx CommandTag into either nil or
// ErrVersionConflict. Use it right after a compare-and-set UPDATE:
//
//	tag, err := tx.Exec(ctx, `UPDATE app.okrs SET progress=$1, version=version+1
//	    WHERE id=$2 AND version=$3`, progress, id, ver)
//	if err := tenantdb.CheckedUpdate(tag, err); err != nil { return err }
func CheckedUpdate(tag pgConnTag, err error) error {
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrVersionConflict
	}
	return nil
}

// pgConnTag is the minimum surface of pgconn.CommandTag used by CheckedUpdate.
// Declared as an interface so tests can supply a stub without importing pgconn.
type pgConnTag interface {
	RowsAffected() int64
}
