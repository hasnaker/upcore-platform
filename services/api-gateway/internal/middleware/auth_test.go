package middleware

import (
	"crypto/rand"
	"crypto/rsa"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	gatewayjwt "github.com/upcore/api-gateway/internal/jwt"
)

func generateKey(t *testing.T) *rsa.PrivateKey {
	t.Helper()
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	require.NoError(t, err)
	return key
}

func createValidator(t *testing.T, key *rsa.PrivateKey) *gatewayjwt.Validator {
	t.Helper()
	cache := gatewayjwt.NewJWKSCache("http://localhost/jwks", time.Hour)
	cache.SetTestKey("test-kid", &key.PublicKey)
	return gatewayjwt.NewValidator(cache, "test-issuer", "")
}

func signTestToken(t *testing.T, key *rsa.PrivateKey, claims jwt.Claims) string {
	t.Helper()
	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	token.Header["kid"] = "test-kid"
	signed, err := token.SignedString(key)
	require.NoError(t, err)
	return signed
}

func TestAuthMiddleware_ValidToken(t *testing.T) {
	key := generateKey(t)
	validator := createValidator(t, key)

	claims := &gatewayjwt.Claims{
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    "test-issuer",
			Subject:   "user-123",
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
		TenantID: "tenant-456",
		Roles:    []string{"admin"},
		Email:    "test@example.com",
	}

	var capturedUserID, capturedRoles, capturedEmail string
	handler := AuthMiddleware(validator, nil)(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			capturedUserID = r.Header.Get("X-User-Id")
			capturedRoles = r.Header.Get("X-User-Roles")
			capturedEmail = r.Header.Get("X-User-Email")
			w.WriteHeader(http.StatusOK)
		}),
	)

	tokenStr := signTestToken(t, key, claims)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/test", nil)
	req.Header.Set("Authorization", "Bearer "+tokenStr)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)
	assert.Equal(t, "user-123", capturedUserID)
	assert.Contains(t, capturedRoles, "admin")
	assert.Equal(t, "test@example.com", capturedEmail)
}

func TestAuthMiddleware_MissingToken(t *testing.T) {
	key := generateKey(t)
	validator := createValidator(t, key)

	handler := AuthMiddleware(validator, nil)(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			t.Fatal("handler should not be called")
		}),
	)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/test", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusUnauthorized, rec.Code)
	assert.Equal(t, `Bearer realm="upcore"`, rec.Header().Get("WWW-Authenticate"))
}

func TestAuthMiddleware_InvalidToken(t *testing.T) {
	key := generateKey(t)
	validator := createValidator(t, key)

	handler := AuthMiddleware(validator, nil)(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			t.Fatal("handler should not be called")
		}),
	)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/test", nil)
	req.Header.Set("Authorization", "Bearer invalid-token")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusUnauthorized, rec.Code)
}

func TestAuthMiddleware_SkipPaths(t *testing.T) {
	key := generateKey(t)
	validator := createValidator(t, key)

	skipPaths := []string{"/health", "/api/v1/auth*", "/webhooks/clerk*"}

	handler := AuthMiddleware(validator, skipPaths)(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		}),
	)

	tests := []struct {
		path   string
		status int
	}{
		{"/health", http.StatusOK},
		{"/api/v1/auth/login", http.StatusOK},
		{"/api/v1/auth/register", http.StatusOK},
		{"/webhooks/clerk", http.StatusOK},
		{"/api/v1/tenants", http.StatusUnauthorized},
		{"/api/v1/employees", http.StatusUnauthorized},
	}

	for _, tt := range tests {
		t.Run(tt.path, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, tt.path, nil)
			rec := httptest.NewRecorder()
			handler.ServeHTTP(rec, req)
			assert.Equal(t, tt.status, rec.Code)
		})
	}
}

func TestAuthMiddleware_InvalidFormat(t *testing.T) {
	key := generateKey(t)
	validator := createValidator(t, key)

	handler := AuthMiddleware(validator, nil)(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			t.Fatal("handler should not be called")
		}),
	)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/test", nil)
	req.Header.Set("Authorization", "Basic dXNlcjpwYXNz")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusUnauthorized, rec.Code)
}

func TestShouldSkipAuth(t *testing.T) {
	skipPaths := []string{"/health", "/api/v1/auth*", "/webhooks/*"}

	tests := []struct {
		path   string
		expect bool
	}{
		{"/health", true},
		{"/api/v1/auth", true},
		{"/api/v1/auth/login", true},
		{"/webhooks/clerk", true},
		{"/webhooks/stripe", true},
		{"/api/v1/tenants", false},
		{"/api/v1/employees", false},
		{"/healthy", false},
	}

	for _, tt := range tests {
		t.Run(tt.path, func(t *testing.T) {
			assert.Equal(t, tt.expect, shouldSkipAuth(tt.path, skipPaths))
		})
	}
}
