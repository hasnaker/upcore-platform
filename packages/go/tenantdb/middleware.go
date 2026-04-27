// HTTP middleware glue for tenantdb.
//
// Each UpCore Go service extracts the tenant + user IDs from the gateway-
// signed X-Tenant-ID / X-User-ID headers in its own middleware package.
// tenantdb.Middleware wraps that existing extractor so service code can
// simply call:
//
//	tdb := tenantdb.NewFromPool(pool)
//	r.Use(tenantdb.HTTPMiddleware(tdb, tenantdb.HTTPOptions{
//	    TenantFromContext: func(ctx context.Context) (uuid.UUID, bool) {
//	        return mw.TenantIDFromContext(ctx), mw.TenantIDFromContext(ctx) != uuid.Nil
//	    },
//	    UserFromContext: mw.UserIDFromContext,
//	    SkipPaths: []string{"/health", "/ready"},
//	}))
//
// Unlike rlsctx (which pins a sqlx.Conn for the entire request), this
// middleware is a no-op at the HTTP boundary: it simply attaches the
// TenantDB handle + tenant/user IDs to the request context. Repositories
// then open a short tx via tenantdb.FromContext(ctx).BeginTenantTx(...).
// This keeps connection-pool pressure low because pgx only holds a conn
// for the duration of a single SQL tx, not the whole HTTP request.

package tenantdb

import (
	"context"
	"net/http"
	"strings"

	"github.com/google/uuid"
)

// ctxKey is the opaque key for storing TenantDB + ids in the request context.
type ctxKey struct{ name string }

var (
	ctxKeyTenantDB = ctxKey{name: "tenantdb.handle"}
	ctxKeyTenantID = ctxKey{name: "tenantdb.tenant_id"}
	ctxKeyUserID   = ctxKey{name: "tenantdb.user_id"}
)

// HTTPOptions configures HTTPMiddleware.
type HTTPOptions struct {
	// TenantFromContext must return the tenant UUID for this request. If
	// the second return is false, the middleware passes the request through
	// without attaching a TenantDB handle (caller remains unauthenticated).
	TenantFromContext func(ctx context.Context) (uuid.UUID, bool)
	// UserFromContext returns the acting user UUID (optional; uuid.Nil OK).
	UserFromContext func(ctx context.Context) uuid.UUID
	// SkipPaths lets the middleware bypass setup for health/readiness
	// endpoints. Prefix match.
	SkipPaths []string
}

// HTTPMiddleware attaches the TenantDB handle + tenant/user IDs to each
// authenticated request's context. Downstream code calls
// tenantdb.FromContext to get a short-lived tx scoped to RLS.
func HTTPMiddleware(tdb *TenantDB, opts HTTPOptions) func(http.Handler) http.Handler {
	if tdb == nil {
		panic("tenantdb: HTTPMiddleware requires a non-nil TenantDB")
	}
	if opts.TenantFromContext == nil {
		panic("tenantdb: HTTPMiddleware requires TenantFromContext")
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			for _, p := range opts.SkipPaths {
				if strings.HasPrefix(r.URL.Path, p) {
					next.ServeHTTP(w, r)
					return
				}
			}
			tenantID, ok := opts.TenantFromContext(r.Context())
			if !ok || tenantID == uuid.Nil {
				// Unauthenticated request — downstream handlers that need
				// the RLS tx will fail loudly via current_tenant_id().
				next.ServeHTTP(w, r)
				return
			}
			var userID uuid.UUID
			if opts.UserFromContext != nil {
				userID = opts.UserFromContext(r.Context())
			}
			ctx := context.WithValue(r.Context(), ctxKeyTenantDB, tdb)
			ctx = context.WithValue(ctx, ctxKeyTenantID, tenantID)
			if userID != uuid.Nil {
				ctx = context.WithValue(ctx, ctxKeyUserID, userID)
			}
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// FromContext returns the TenantDB handle attached by HTTPMiddleware plus
// the tenant and user IDs for the request. ok is false when the middleware
// has not run (e.g. unauthenticated routes).
func FromContext(ctx context.Context) (tdb *TenantDB, tenantID, userID uuid.UUID, ok bool) {
	t, _ := ctx.Value(ctxKeyTenantDB).(*TenantDB)
	tid, tidOK := ctx.Value(ctxKeyTenantID).(uuid.UUID)
	uid, _ := ctx.Value(ctxKeyUserID).(uuid.UUID)
	if t == nil || !tidOK || tid == uuid.Nil {
		return nil, uuid.Nil, uuid.Nil, false
	}
	return t, tid, uid, true
}

// RunInTx is a convenience helper: looks up the request-scoped TenantDB and
// runs fn inside a tenant-pinned tx. Shorthand for the common repository
// pattern:
//
//	err := tenantdb.RunInTx(ctx, func(tx pgx.Tx) error {
//	    return r.updateOKR(ctx, tx, ...)
//	})
func RunInTx(ctx context.Context, fn func(tx pgxTx) error) error {
	tdb, tid, uid, ok := FromContext(ctx)
	if !ok {
		return ErrTenantRequired
	}
	tx, err := tdb.BeginTenantTx(ctx, tid, uid)
	if err != nil {
		return err
	}
	if err := fn(tx); err != nil {
		_ = tx.Rollback(ctx)
		return err
	}
	return tx.Commit(ctx)
}

// pgxTx is the minimum surface we expose to consumers. Defined locally so
// the middleware file does not leak pgx types beyond what is necessary.
// pgx.Tx satisfies this interface.
type pgxTx interface {
	Rollback(ctx context.Context) error
	Commit(ctx context.Context) error
}
