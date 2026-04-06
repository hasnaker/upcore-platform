package jwt

import (
	"crypto/rand"
	"crypto/rsa"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func generateTestKey(t *testing.T) *rsa.PrivateKey {
	t.Helper()
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	require.NoError(t, err)
	return key
}

func signToken(t *testing.T, key *rsa.PrivateKey, claims *Claims) string {
	t.Helper()
	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	token.Header["kid"] = "test-kid"
	signed, err := token.SignedString(key)
	require.NoError(t, err)
	return signed
}

func TestValidator_ValidToken(t *testing.T) {
	key := generateTestKey(t)
	cache := NewJWKSCache("http://localhost/jwks", time.Hour)
	cache.mu.Lock()
	cache.keys["test-kid"] = &key.PublicKey
	cache.lastFetch = time.Now()
	cache.mu.Unlock()

	validator := NewValidator(cache, "test-issuer", "test-audience")

	claims := &Claims{
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    "test-issuer",
			Subject:   "user-123",
			Audience:  jwt.ClaimStrings{"test-audience"},
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
		TenantID: "tenant-456",
		Roles:    []string{"admin", "user"},
		Email:    "test@example.com",
	}

	tokenStr := signToken(t, key, claims)

	result, err := validator.Validate(tokenStr)
	require.NoError(t, err)
	assert.Equal(t, "user-123", result.GetUserID())
	assert.Equal(t, "tenant-456", result.GetTenantID())
	assert.Contains(t, result.GetRoles(), "admin")
	assert.Equal(t, "test@example.com", result.Email)
}

func TestValidator_BearerPrefix(t *testing.T) {
	key := generateTestKey(t)
	cache := NewJWKSCache("http://localhost/jwks", time.Hour)
	cache.mu.Lock()
	cache.keys["test-kid"] = &key.PublicKey
	cache.lastFetch = time.Now()
	cache.mu.Unlock()

	validator := NewValidator(cache, "test-issuer", "")

	claims := &Claims{
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    "test-issuer",
			Subject:   "user-123",
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	tokenStr := "Bearer " + signToken(t, key, claims)
	result, err := validator.Validate(tokenStr)
	require.NoError(t, err)
	assert.Equal(t, "user-123", result.GetUserID())
}

func TestValidator_ExpiredToken(t *testing.T) {
	key := generateTestKey(t)
	cache := NewJWKSCache("http://localhost/jwks", time.Hour)
	cache.mu.Lock()
	cache.keys["test-kid"] = &key.PublicKey
	cache.lastFetch = time.Now()
	cache.mu.Unlock()

	validator := NewValidator(cache, "test-issuer", "")

	claims := &Claims{
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    "test-issuer",
			Subject:   "user-123",
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(-time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now().Add(-2 * time.Hour)),
		},
	}

	tokenStr := signToken(t, key, claims)
	_, err := validator.Validate(tokenStr)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "token")
}

func TestValidator_WrongIssuer(t *testing.T) {
	key := generateTestKey(t)
	cache := NewJWKSCache("http://localhost/jwks", time.Hour)
	cache.mu.Lock()
	cache.keys["test-kid"] = &key.PublicKey
	cache.lastFetch = time.Now()
	cache.mu.Unlock()

	validator := NewValidator(cache, "expected-issuer", "")

	claims := &Claims{
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    "wrong-issuer",
			Subject:   "user-123",
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	tokenStr := signToken(t, key, claims)
	_, err := validator.Validate(tokenStr)
	assert.Error(t, err)
}

func TestValidator_WrongAudience(t *testing.T) {
	key := generateTestKey(t)
	cache := NewJWKSCache("http://localhost/jwks", time.Hour)
	cache.mu.Lock()
	cache.keys["test-kid"] = &key.PublicKey
	cache.lastFetch = time.Now()
	cache.mu.Unlock()

	validator := NewValidator(cache, "test-issuer", "expected-audience")

	claims := &Claims{
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    "test-issuer",
			Subject:   "user-123",
			Audience:  jwt.ClaimStrings{"wrong-audience"},
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	tokenStr := signToken(t, key, claims)
	_, err := validator.Validate(tokenStr)
	assert.Error(t, err)
}

func TestValidator_EmptyToken(t *testing.T) {
	cache := NewJWKSCache("http://localhost/jwks", time.Hour)
	validator := NewValidator(cache, "test-issuer", "")

	_, err := validator.Validate("")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "empty token")
}

func TestClaims_GetTenantID(t *testing.T) {
	tests := []struct {
		name     string
		claims   Claims
		expected string
	}{
		{
			name:     "tenant_id present",
			claims:   Claims{TenantID: "tenant-1"},
			expected: "tenant-1",
		},
		{
			name:     "org_id fallback",
			claims:   Claims{OrgID: "org-1"},
			expected: "org-1",
		},
		{
			name:     "tenant_id preferred over org_id",
			claims:   Claims{TenantID: "tenant-1", OrgID: "org-1"},
			expected: "tenant-1",
		},
		{
			name:     "neither present",
			claims:   Claims{},
			expected: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.expected, tt.claims.GetTenantID())
		})
	}
}

func TestClaims_GetRoles(t *testing.T) {
	claims := Claims{
		Roles:   []string{"admin", "user"},
		OrgRole: "org_admin",
	}

	roles := claims.GetRoles()
	assert.Contains(t, roles, "admin")
	assert.Contains(t, roles, "user")
	assert.Contains(t, roles, "org_admin")
}
