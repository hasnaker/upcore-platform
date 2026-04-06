package middleware

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"

	gatewayjwt "github.com/upcore/api-gateway/internal/jwt"
)

func TestTenantMiddleware_InjectsTenantID(t *testing.T) {
	claims := &gatewayjwt.Claims{
		TenantID: "tenant-123",
	}
	claims.Subject = "user-456"

	var capturedTenantID, capturedTenantHeader string
	handler := TenantMiddleware()(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			capturedTenantID = TenantIDFromContext(r.Context())
			capturedTenantHeader = r.Header.Get("X-Tenant-Id")
			w.WriteHeader(http.StatusOK)
		}),
	)

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	ctx := context.WithValue(req.Context(), claimsKey{}, claims)
	req = req.WithContext(ctx)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)
	assert.Equal(t, "tenant-123", capturedTenantID)
	assert.Equal(t, "tenant-123", capturedTenantHeader)
}

func TestTenantMiddleware_MissingTenantID(t *testing.T) {
	claims := &gatewayjwt.Claims{}
	claims.Subject = "user-456"

	handler := TenantMiddleware()(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			t.Fatal("handler should not be called when tenant_id is missing")
		}),
	)

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	ctx := context.WithValue(req.Context(), claimsKey{}, claims)
	req = req.WithContext(ctx)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusForbidden, rec.Code)
}

func TestTenantMiddleware_NoClaims(t *testing.T) {
	// Unauthenticated route (no claims in context) should pass through
	handler := TenantMiddleware()(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		}),
	)

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)
}

func TestTenantMiddleware_OrgIDFallback(t *testing.T) {
	claims := &gatewayjwt.Claims{
		OrgID: "org-789",
	}
	claims.Subject = "user-456"

	var capturedTenantID string
	handler := TenantMiddleware()(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			capturedTenantID = TenantIDFromContext(r.Context())
			w.WriteHeader(http.StatusOK)
		}),
	)

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	ctx := context.WithValue(req.Context(), claimsKey{}, claims)
	req = req.WithContext(ctx)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)
	assert.Equal(t, "org-789", capturedTenantID)
}

func TestTenantIDFromContext_Empty(t *testing.T) {
	ctx := context.Background()
	assert.Empty(t, TenantIDFromContext(ctx))
}

func TestUserIDFromContext_Empty(t *testing.T) {
	ctx := context.Background()
	assert.Empty(t, UserIDFromContext(ctx))
}
