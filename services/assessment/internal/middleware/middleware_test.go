package middleware

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

func TestTenantInjector_WithHeaders(t *testing.T) {
	tenantID := uuid.New()
	userID := uuid.New()

	handler := TenantInjector(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		tid := TenantIDFromContext(r.Context())
		uid := UserIDFromContext(r.Context())
		role := RoleFromContext(r.Context())
		assert.Equal(t, tenantID, tid)
		assert.Equal(t, userID, uid)
		assert.Equal(t, "admin", role)
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("X-Tenant-ID", tenantID.String())
	req.Header.Set("X-User-ID", userID.String())
	req.Header.Set("X-User-Role", "admin")

	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)
}

func TestTenantInjector_NoHeaders(t *testing.T) {
	handler := TenantInjector(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		tid := TenantIDFromContext(r.Context())
		uid := UserIDFromContext(r.Context())
		assert.Equal(t, uuid.Nil, tid)
		assert.Equal(t, uuid.Nil, uid)
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)
}

func TestTenantIDFromContext_Empty(t *testing.T) {
	ctx := context.Background()
	assert.Equal(t, uuid.Nil, TenantIDFromContext(ctx))
}

func TestUserIDFromContext_Empty(t *testing.T) {
	ctx := context.Background()
	assert.Equal(t, uuid.Nil, UserIDFromContext(ctx))
}

func TestRoleFromContext_Empty(t *testing.T) {
	ctx := context.Background()
	assert.Equal(t, "", RoleFromContext(ctx))
}

func TestRequireAuth_NoAuthChecker_NoHeaders(t *testing.T) {
	handler := RequireAuth(nil)(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)
	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestRequireAuth_WithTenantHeaders(t *testing.T) {
	tenantID := uuid.New()
	userID := uuid.New()

	handler := RequireAuth(nil)(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	ctx := context.WithValue(req.Context(), CtxTenantID, tenantID)
	ctx = context.WithValue(ctx, CtxUserID, userID)
	req = req.WithContext(ctx)

	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)
}

func TestRequireRole_Allowed(t *testing.T) {
	handler := RequireRole("admin", "hr_admin")(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	ctx := context.WithValue(req.Context(), CtxRole, "admin")
	req = req.WithContext(ctx)

	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)
}

func TestRequireRole_Forbidden(t *testing.T) {
	handler := RequireRole("admin")(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	ctx := context.WithValue(req.Context(), CtxRole, "employee")
	req = req.WithContext(ctx)

	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)
	assert.Equal(t, http.StatusForbidden, w.Code)
}
