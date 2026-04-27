// Package rlsctx provides a shared HTTP middleware and sqlx helpers that pin
// a Postgres connection per-request and set the session GUCs app.tenant_id +
// app.user_id so row-level-security policies (and the strict current_tenant_id()
// function from migration 062) operate correctly.
//
// Usage (inside a service's HTTP router, after the tenant injector middleware):
//
//	rls := rlsctx.NewMiddleware(db, rlsctx.Options{
//	    TenantFromContext: func(ctx context.Context) (uuid.UUID, bool) {
//	        return middleware.TenantIDFromContext(ctx), true
//	    },
//	    UserFromContext:   middleware.UserIDFromContext,
//	    Logger:            rlsctx.StdLogger(logger),
//	})
//	r.Use(rls.Handler)
//
// Each request obtains a dedicated *sqlx.Conn, sets both GUCs, stuffs the Conn
// into the request context, and repositories retrieve it via
// rlsctx.ConnFromContext(ctx). When the request returns, the Conn is released
// to the pool and the RESET ALL command clears the GUCs so the next request
// on that connection starts clean.
package rlsctx

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"net/http"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type ctxKey struct{}

var (
	// ErrRLSNotConfigured is returned by ConnFromContext when the middleware
	// has not run for this request.
	ErrRLSNotConfigured = errors.New("rlsctx: no connection in context (middleware missing?)")
	// ErrTenantRequired is returned when the resolver reports no tenant for
	// a protected request.
	ErrTenantRequired = errors.New("rlsctx: tenant id is required")
)

// Logger is the minimum logging surface used internally.
type Logger interface {
	Debug(msg string, kv ...any)
	Warn(msg string, kv ...any)
	Error(msg string, kv ...any)
}

// nopLogger discards logs.
type nopLogger struct{}

func (nopLogger) Debug(string, ...any) {}
func (nopLogger) Warn(string, ...any)  {}
func (nopLogger) Error(string, ...any) {}

// StdLogger wraps any logger that has .Debug/.Warn/.Error methods matching
// the Logger interface. It is a pure pass-through — callers may pass zerolog
// or logrus wrappers of their own.
func StdLogger(l Logger) Logger {
	if l == nil {
		return nopLogger{}
	}
	return l
}

// Options configures the middleware.
type Options struct {
	// TenantFromContext must return the tenant UUID for this request. If the
	// second return is false, the middleware treats the request as
	// unauthenticated and skips RLS setup (the downstream handler is still
	// invoked). Repositories that depend on RLS will then fail loudly with
	// ErrRLSNotConfigured.
	TenantFromContext func(ctx context.Context) (uuid.UUID, bool)
	// UserFromContext returns the acting user UUID (optional; may be uuid.Nil).
	UserFromContext func(ctx context.Context) uuid.UUID
	// SkipPaths allows the middleware to bypass RLS for health/readiness
	// endpoints. Prefix match.
	SkipPaths []string
	// Logger (optional).
	Logger Logger
}

// Middleware is the stateful HTTP middleware that pins per-request DB
// connections and sets GUCs.
type Middleware struct {
	db   *sqlx.DB
	opts Options
	log  Logger
}

// NewMiddleware constructs a reusable RLS middleware.
func NewMiddleware(db *sqlx.DB, opts Options) *Middleware {
	if db == nil {
		panic("rlsctx: db is nil")
	}
	if opts.TenantFromContext == nil {
		panic("rlsctx: TenantFromContext is required")
	}
	if opts.Logger == nil {
		opts.Logger = nopLogger{}
	}
	return &Middleware{db: db, opts: opts, log: opts.Logger}
}

// Handler returns a net/http middleware that installs a pinned *sqlx.Conn
// with the correct GUCs on every request.
func (m *Middleware) Handler(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		for _, p := range m.opts.SkipPaths {
			if hasPrefix(r.URL.Path, p) {
				next.ServeHTTP(w, r)
				return
			}
		}

		tenantID, ok := m.opts.TenantFromContext(r.Context())
		if !ok || tenantID == uuid.Nil {
			// Unauthenticated route — do not pin a connection, do not set
			// GUCs. Repositories that still try to query will fail via the
			// migration-062 RAISE EXCEPTION, which is the desired loud-fail
			// behaviour.
			next.ServeHTTP(w, r)
			return
		}

		var userID uuid.UUID
		if m.opts.UserFromContext != nil {
			userID = m.opts.UserFromContext(r.Context())
		}

		conn, err := m.db.Connx(r.Context())
		if err != nil {
			m.log.Error("rlsctx: acquire connection failed", "error", err.Error())
			http.Error(w, `{"error":"db_unavailable"}`, http.StatusServiceUnavailable)
			return
		}
		defer func() {
			// Reset GUCs on release so the pooled conn is clean for the next
			// caller. Best-effort: if RESET fails we close the conn rather
			// than risk cross-tenant leakage.
			if _, rerr := conn.ExecContext(context.Background(), "RESET ALL"); rerr != nil {
				m.log.Warn("rlsctx: RESET ALL failed; closing conn",
					"error", rerr.Error())
				_ = conn.Close() // forces a fresh conn next time
				return
			}
			_ = conn.Close()
		}()

		if err := setGUCs(r.Context(), conn, tenantID, userID); err != nil {
			m.log.Error("rlsctx: set_config failed",
				"tenant_id", tenantID.String(),
				"error", err.Error())
			http.Error(w, `{"error":"rls_setup_failed"}`, http.StatusInternalServerError)
			return
		}

		ctx := context.WithValue(r.Context(), ctxKey{}, conn)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// setGUCs sets the session-scoped GUCs. We use SET (not SET LOCAL) because
// we are outside a transaction — the GUC scope is the pinned connection and
// is cleared by the deferred RESET ALL.
func setGUCs(ctx context.Context, conn *sqlx.Conn, tenantID, userID uuid.UUID) error {
	if _, err := conn.ExecContext(ctx,
		"SELECT set_config('app.tenant_id', $1, false)", tenantID.String()); err != nil {
		return fmt.Errorf("set app.tenant_id: %w", err)
	}
	if userID != uuid.Nil {
		if _, err := conn.ExecContext(ctx,
			"SELECT set_config('app.user_id', $1, false)", userID.String()); err != nil {
			return fmt.Errorf("set app.user_id: %w", err)
		}
	}
	return nil
}

// ConnFromContext returns the pinned *sqlx.Conn for this request.
// Repositories MUST call this (or WithConn below) rather than using the
// shared *sqlx.DB directly; otherwise the GUCs are not set and queries will
// error via migration-062 current_tenant_id().
func ConnFromContext(ctx context.Context) (*sqlx.Conn, error) {
	c, ok := ctx.Value(ctxKey{}).(*sqlx.Conn)
	if !ok || c == nil {
		return nil, ErrRLSNotConfigured
	}
	return c, nil
}

// Querier is the subset of *sqlx.Conn / *sqlx.Tx operations repositories use.
type Querier interface {
	GetContext(ctx context.Context, dest any, query string, args ...any) error
	SelectContext(ctx context.Context, dest any, query string, args ...any) error
	ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error)
	QueryxContext(ctx context.Context, query string, args ...any) (*sqlx.Rows, error)
	QueryRowxContext(ctx context.Context, query string, args ...any) *sqlx.Row
}

// QuerierFromContext returns the request-scoped Querier (a pinned Conn with
// GUCs set). Use this from repository functions:
//
//	q, err := rlsctx.QuerierFromContext(ctx)
//	if err != nil { return err }
//	err = q.GetContext(ctx, &row, "SELECT ... WHERE id=$1", id)
func QuerierFromContext(ctx context.Context) (Querier, error) {
	return ConnFromContext(ctx)
}

// WithConn is a test/integration helper that pins a conn in ctx without HTTP.
// Useful for worker jobs that must still run under RLS.
func WithConn(ctx context.Context, conn *sqlx.Conn) context.Context {
	return context.WithValue(ctx, ctxKey{}, conn)
}

// RunWithTenant acquires a connection, sets the tenant GUC, invokes fn, and
// resets GUCs on return. Intended for background workers (outbox publisher,
// archive worker, cron) that must run repository code under RLS.
func RunWithTenant(ctx context.Context, db *sqlx.DB, tenantID, userID uuid.UUID, fn func(ctx context.Context) error) error {
	if db == nil {
		return errors.New("rlsctx: db is nil")
	}
	if tenantID == uuid.Nil {
		return ErrTenantRequired
	}
	conn, err := db.Connx(ctx)
	if err != nil {
		return fmt.Errorf("rlsctx: acquire conn: %w", err)
	}
	defer func() {
		_, _ = conn.ExecContext(context.Background(), "RESET ALL")
		_ = conn.Close()
	}()
	if err := setGUCs(ctx, conn, tenantID, userID); err != nil {
		return err
	}
	return fn(WithConn(ctx, conn))
}

func hasPrefix(s, prefix string) bool {
	if len(prefix) == 0 {
		return true
	}
	return len(s) >= len(prefix) && s[:len(prefix)] == prefix
}
