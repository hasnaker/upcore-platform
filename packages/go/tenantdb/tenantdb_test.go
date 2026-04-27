package tenantdb

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

// --- Fakes -----------------------------------------------------------------

// fakeTag implements pgConnTag.
type fakeTag struct{ rows int64 }

func (f fakeTag) RowsAffected() int64 { return f.rows }

// stubTx implements pgx.Tx with the minimum methods used by BeginTenantTx
// and by consumer closures. Only Exec / Commit / Rollback are exercised.
type stubTx struct {
	execErr     error
	commitErr   error
	committed   bool
	rolledBack  bool
	execHistory []string
}

func (t *stubTx) Begin(context.Context) (pgx.Tx, error)                            { return nil, nil }
func (t *stubTx) Commit(context.Context) error                                     { t.committed = true; return t.commitErr }
func (t *stubTx) Rollback(context.Context) error                                   { t.rolledBack = true; return nil }
func (t *stubTx) CopyFrom(context.Context, pgx.Identifier, []string, pgx.CopyFromSource) (int64, error) {
	return 0, nil
}
func (t *stubTx) SendBatch(context.Context, *pgx.Batch) pgx.BatchResults { return nil }
func (t *stubTx) LargeObjects() pgx.LargeObjects                        { return pgx.LargeObjects{} }
func (t *stubTx) Prepare(context.Context, string, string) (*pgconn.StatementDescription, error) {
	return nil, nil
}
func (t *stubTx) Exec(_ context.Context, sql string, _ ...any) (pgconn.CommandTag, error) {
	t.execHistory = append(t.execHistory, sql)
	return pgconn.CommandTag{}, t.execErr
}
func (t *stubTx) Query(context.Context, string, ...any) (pgx.Rows, error) {
	return nil, nil
}
func (t *stubTx) QueryRow(context.Context, string, ...any) pgx.Row { return nil }
func (t *stubTx) Conn() *pgx.Conn                                  { return nil }

// fakePool implements Pool.
type fakePool struct {
	begins  int
	onBegin func() (pgx.Tx, error)
}

func (p *fakePool) BeginTx(_ context.Context, _ pgx.TxOptions) (pgx.Tx, error) {
	p.begins++
	if p.onBegin != nil {
		return p.onBegin()
	}
	return &stubTx{}, nil
}

// --- Unit tests ------------------------------------------------------------

func TestBeginTenantTx_RejectsNilTenant(t *testing.T) {
	tdb := NewFromPool(&fakePool{})
	_, err := tdb.BeginTenantTx(context.Background(), uuid.Nil, uuid.New())
	if !errors.Is(err, ErrTenantRequired) {
		t.Fatalf("expected ErrTenantRequired, got %v", err)
	}
}

func TestBeginTenantTx_SetsBothGUCsWhenUserProvided(t *testing.T) {
	tx := &stubTx{}
	pool := &fakePool{onBegin: func() (pgx.Tx, error) { return tx, nil }}
	tdb := NewFromPool(pool)

	_, err := tdb.BeginTenantTx(context.Background(), uuid.New(), uuid.New())
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if len(tx.execHistory) != 2 {
		t.Fatalf("expected 2 SET LOCAL exec calls, got %d: %v", len(tx.execHistory), tx.execHistory)
	}
	if !contains(tx.execHistory[0], "app.tenant_id") {
		t.Fatalf("first exec should set app.tenant_id, got %q", tx.execHistory[0])
	}
	if !contains(tx.execHistory[1], "app.user_id") {
		t.Fatalf("second exec should set app.user_id, got %q", tx.execHistory[1])
	}
}

func TestBeginTenantTx_SkipsUserWhenNil(t *testing.T) {
	tx := &stubTx{}
	pool := &fakePool{onBegin: func() (pgx.Tx, error) { return tx, nil }}
	tdb := NewFromPool(pool)

	_, err := tdb.BeginTenantTx(context.Background(), uuid.New(), uuid.Nil)
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if len(tx.execHistory) != 1 {
		t.Fatalf("expected only tenant_id SET LOCAL, got %v", tx.execHistory)
	}
}

func TestBeginTenantTx_RollsBackOnSetLocalFailure(t *testing.T) {
	boom := errors.New("SET LOCAL failed")
	tx := &stubTx{execErr: boom}
	pool := &fakePool{onBegin: func() (pgx.Tx, error) { return tx, nil }}
	tdb := NewFromPool(pool)

	_, err := tdb.BeginTenantTx(context.Background(), uuid.New(), uuid.Nil)
	if err == nil || !errors.Is(err, boom) {
		t.Fatalf("expected boom err, got %v", err)
	}
	if !tx.rolledBack {
		t.Fatal("tx must be rolled back when SET LOCAL fails")
	}
}

func TestCheckedUpdate_ReturnsConflictOnZeroRows(t *testing.T) {
	if err := CheckedUpdate(fakeTag{rows: 0}, nil); !errors.Is(err, ErrVersionConflict) {
		t.Fatalf("expected ErrVersionConflict, got %v", err)
	}
	if err := CheckedUpdate(fakeTag{rows: 1}, nil); err != nil {
		t.Fatalf("expected nil for 1 row, got %v", err)
	}
	wrapped := errors.New("db down")
	if err := CheckedUpdate(fakeTag{rows: 0}, wrapped); !errors.Is(err, wrapped) {
		t.Fatalf("original error must be propagated, got %v", err)
	}
}

// TestWithOptimisticRetry_SucceedsOnFirstAttempt exercises the happy path.
func TestWithOptimisticRetry_SucceedsOnFirstAttempt(t *testing.T) {
	pool := &fakePool{}
	tdb := NewFromPool(pool)

	calls := 0
	err := tdb.WithOptimisticRetry(context.Background(), uuid.New(), uuid.Nil,
		RetryOptions{MaxAttempts: 3, BaseBackoff: time.Microsecond},
		func(tx pgx.Tx) error {
			calls++
			return nil
		})
	if err != nil {
		t.Fatalf("expected nil, got %v", err)
	}
	if calls != 1 {
		t.Fatalf("expected 1 call, got %d", calls)
	}
	if pool.begins != 1 {
		t.Fatalf("expected 1 begin, got %d", pool.begins)
	}
}

// TestWithOptimisticRetry_RetriesOnConflictThenSucceeds verifies the retry
// loop fires when fn returns ErrVersionConflict.
func TestWithOptimisticRetry_RetriesOnConflictThenSucceeds(t *testing.T) {
	pool := &fakePool{}
	tdb := NewFromPool(pool)

	calls := 0
	err := tdb.WithOptimisticRetry(context.Background(), uuid.New(), uuid.Nil,
		RetryOptions{MaxAttempts: 3, BaseBackoff: time.Microsecond, MaxBackoff: time.Microsecond},
		func(tx pgx.Tx) error {
			calls++
			if calls < 3 {
				return ErrVersionConflict
			}
			return nil
		})
	if err != nil {
		t.Fatalf("expected nil after retries, got %v", err)
	}
	if calls != 3 {
		t.Fatalf("expected 3 calls, got %d", calls)
	}
	if pool.begins != 3 {
		t.Fatalf("expected 3 begins, got %d", pool.begins)
	}
}

// TestWithOptimisticRetry_GivesUpAfterMaxAttempts ensures we surface the
// conflict after exhausting retries.
func TestWithOptimisticRetry_GivesUpAfterMaxAttempts(t *testing.T) {
	pool := &fakePool{}
	tdb := NewFromPool(pool)

	err := tdb.WithOptimisticRetry(context.Background(), uuid.New(), uuid.Nil,
		RetryOptions{MaxAttempts: 2, BaseBackoff: time.Microsecond, MaxBackoff: time.Microsecond},
		func(tx pgx.Tx) error {
			return ErrVersionConflict
		})
	if !errors.Is(err, ErrVersionConflict) {
		t.Fatalf("expected ErrVersionConflict, got %v", err)
	}
	if pool.begins != 2 {
		t.Fatalf("expected 2 begins, got %d", pool.begins)
	}
}

// TestWithOptimisticRetry_DoesNotRetryOnNonConflictError ensures arbitrary
// errors short-circuit the retry.
func TestWithOptimisticRetry_DoesNotRetryOnNonConflictError(t *testing.T) {
	pool := &fakePool{}
	tdb := NewFromPool(pool)
	boom := errors.New("boom")

	calls := 0
	err := tdb.WithOptimisticRetry(context.Background(), uuid.New(), uuid.Nil,
		RetryOptions{MaxAttempts: 5, BaseBackoff: time.Microsecond},
		func(tx pgx.Tx) error {
			calls++
			return boom
		})
	if !errors.Is(err, boom) {
		t.Fatalf("expected wrapped boom, got %v", err)
	}
	if calls != 1 {
		t.Fatalf("expected 1 call (no retry on generic error), got %d", calls)
	}
}

// TestWithOptimisticRetry_CustomClassifier verifies the user can opt-in to
// retry on their own error type (e.g. deadlock_detected, serialization_failure).
func TestWithOptimisticRetry_CustomClassifier(t *testing.T) {
	pool := &fakePool{}
	tdb := NewFromPool(pool)

	sentinelDeadlock := errors.New("40P01: deadlock detected")
	calls := 0
	err := tdb.WithOptimisticRetry(context.Background(), uuid.New(), uuid.Nil,
		RetryOptions{
			MaxAttempts: 3,
			BaseBackoff: time.Microsecond,
			MaxBackoff:  time.Microsecond,
			Classifier: func(err error) bool {
				return errors.Is(err, ErrVersionConflict) || errors.Is(err, sentinelDeadlock)
			},
		},
		func(tx pgx.Tx) error {
			calls++
			if calls < 2 {
				return sentinelDeadlock
			}
			return nil
		})
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}
	if calls != 2 {
		t.Fatalf("expected 2 calls, got %d", calls)
	}
}

// TestWithOptimisticRetry_RespectsCancelledContext ensures we bail fast.
func TestWithOptimisticRetry_RespectsCancelledContext(t *testing.T) {
	pool := &fakePool{}
	tdb := NewFromPool(pool)

	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	err := tdb.WithOptimisticRetry(ctx, uuid.New(), uuid.Nil,
		RetryOptions{MaxAttempts: 3, BaseBackoff: time.Microsecond},
		func(tx pgx.Tx) error {
			t.Fatal("fn must not run under cancelled ctx")
			return nil
		})
	if !errors.Is(err, context.Canceled) {
		t.Fatalf("expected context.Canceled, got %v", err)
	}
}

// contains is a small string contains helper to avoid importing strings.
func contains(s, sub string) bool {
	if len(sub) == 0 {
		return true
	}
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}
