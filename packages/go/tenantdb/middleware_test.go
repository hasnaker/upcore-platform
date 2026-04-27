package tenantdb

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
)

func TestHTTPMiddleware_AttachesHandleForAuthenticatedRequest(t *testing.T) {
	tdb := NewFromPool(&fakePool{})
	tenantID := uuid.New()
	userID := uuid.New()

	mw := HTTPMiddleware(tdb, HTTPOptions{
		TenantFromContext: func(ctx context.Context) (uuid.UUID, bool) {
			return tenantID, true
		},
		UserFromContext: func(ctx context.Context) uuid.UUID { return userID },
	})

	var gotTDB *TenantDB
	var gotTID, gotUID uuid.UUID
	var gotOK bool
	h := mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotTDB, gotTID, gotUID, gotOK = FromContext(r.Context())
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/test", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if !gotOK || gotTDB == nil {
		t.Fatal("FromContext should return the attached handle")
	}
	if gotTID != tenantID {
		t.Fatalf("tenant mismatch: got %s want %s", gotTID, tenantID)
	}
	if gotUID != userID {
		t.Fatalf("user mismatch: got %s want %s", gotUID, userID)
	}
}

func TestHTTPMiddleware_SkipsHealthPaths(t *testing.T) {
	tdb := NewFromPool(&fakePool{})
	called := false
	mw := HTTPMiddleware(tdb, HTTPOptions{
		TenantFromContext: func(ctx context.Context) (uuid.UUID, bool) {
			t.Fatal("tenant resolver should not run for skip paths")
			return uuid.Nil, false
		},
		SkipPaths: []string{"/health", "/ready"},
	})
	h := mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
	}))

	for _, p := range []string{"/health", "/ready/db"} {
		req := httptest.NewRequest(http.MethodGet, p, nil)
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
	}
	if !called {
		t.Fatal("next handler must run for skip paths")
	}
}

func TestHTTPMiddleware_UnauthenticatedPassesThrough(t *testing.T) {
	tdb := NewFromPool(&fakePool{})
	mw := HTTPMiddleware(tdb, HTTPOptions{
		TenantFromContext: func(ctx context.Context) (uuid.UUID, bool) {
			return uuid.Nil, false
		},
	})

	var gotOK bool
	h := mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _, _, gotOK = FromContext(r.Context())
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/public", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if gotOK {
		t.Fatal("unauthenticated requests must not expose a TenantDB handle")
	}
}

func TestRunInTx_RejectsMissingMiddleware(t *testing.T) {
	err := RunInTx(context.Background(), func(tx pgxTx) error { return nil })
	if err == nil || err != ErrTenantRequired {
		t.Fatalf("expected ErrTenantRequired, got %v", err)
	}
}
