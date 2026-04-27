package rlsctx

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

func TestNewMiddleware_PanicsWithoutDB(t *testing.T) {
	defer func() {
		if r := recover(); r == nil {
			t.Fatal("expected panic when db is nil")
		}
	}()
	NewMiddleware(nil, Options{TenantFromContext: func(context.Context) (uuid.UUID, bool) {
		return uuid.New(), true
	}})
}

func TestNewMiddleware_PanicsWithoutResolver(t *testing.T) {
	defer func() {
		if r := recover(); r == nil {
			t.Fatal("expected panic when TenantFromContext is nil")
		}
	}()
	NewMiddleware(&sqlx.DB{}, Options{})
}

func TestConnFromContext_NoConn(t *testing.T) {
	if _, err := ConnFromContext(context.Background()); !errors.Is(err, ErrRLSNotConfigured) {
		t.Fatalf("expected ErrRLSNotConfigured, got %v", err)
	}
}

func TestHandler_SkipPaths(t *testing.T) {
	// Middleware with no DB access required for skip paths.
	m := &Middleware{
		db: nil,
		opts: Options{
			TenantFromContext: func(context.Context) (uuid.UUID, bool) {
				t.Fatal("TenantFromContext should not be called for skipped path")
				return uuid.Nil, false
			},
			SkipPaths: []string{"/health"},
		},
		log: nopLogger{},
	}

	called := false
	h := m.Handler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if !called {
		t.Fatal("next handler must run for skip path")
	}
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
}

func TestHandler_UnauthenticatedPassesThrough(t *testing.T) {
	m := &Middleware{
		db: nil,
		opts: Options{
			TenantFromContext: func(context.Context) (uuid.UUID, bool) {
				return uuid.Nil, false
			},
		},
		log: nopLogger{},
	}
	called := false
	h := m.Handler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		// ConnFromContext must return error — request is unauthenticated.
		if _, err := ConnFromContext(r.Context()); !errors.Is(err, ErrRLSNotConfigured) {
			t.Fatalf("expected ErrRLSNotConfigured, got %v", err)
		}
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/public", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if !called {
		t.Fatal("next handler must run for unauthenticated request")
	}
}

func TestRunWithTenant_RejectsNilTenant(t *testing.T) {
	err := RunWithTenant(context.Background(), &sqlx.DB{}, uuid.Nil, uuid.Nil, func(ctx context.Context) error {
		t.Fatal("fn should not run")
		return nil
	})
	if !errors.Is(err, ErrTenantRequired) {
		t.Fatalf("expected ErrTenantRequired, got %v", err)
	}
}
