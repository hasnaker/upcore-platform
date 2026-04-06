package config

import (
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestLoad_Defaults(t *testing.T) {
	// Clear any env vars that might interfere
	os.Unsetenv("PORT")
	os.Unsetenv("REDIS_URL")
	os.Unsetenv("CLERK_JWKS_URL")

	cfg, err := Load()
	require.NoError(t, err)

	assert.Equal(t, "8080", cfg.Port)
	assert.Equal(t, "development", cfg.Env)
	assert.Equal(t, "info", cfg.LogLevel)
	assert.Equal(t, "redis://localhost:6379/0", cfg.RedisURL)
	assert.Equal(t, "https://api.clerk.dev/v1/jwks", cfg.ClerkJWKSURL)
	assert.Equal(t, "https://clerk.upcore.app", cfg.ClerkIssuer)
	assert.Equal(t, "upcore-api", cfg.JWTAudience)
	assert.Equal(t, 100, cfg.RateLimitPerUser)
	assert.Equal(t, 1000, cfg.RateLimitPerTenant)
	assert.Equal(t, 60, cfg.RateLimitWindowSec)
}

func TestLoad_EnvOverrides(t *testing.T) {
	t.Setenv("PORT", "9090")
	t.Setenv("APP_ENV", "production")
	t.Setenv("LOG_LEVEL", "debug")
	t.Setenv("RATE_LIMIT_PER_USER", "50")

	cfg, err := Load()
	require.NoError(t, err)

	assert.Equal(t, "9090", cfg.Port)
	assert.Equal(t, "production", cfg.Env)
	assert.Equal(t, "debug", cfg.LogLevel)
	assert.Equal(t, 50, cfg.RateLimitPerUser)
}

func TestConfig_IsProduction(t *testing.T) {
	tests := []struct {
		env    string
		expect bool
	}{
		{"production", true},
		{"Production", true},
		{"PRODUCTION", true},
		{"development", false},
		{"staging", false},
		{"", false},
	}

	for _, tt := range tests {
		t.Run(tt.env, func(t *testing.T) {
			cfg := &Config{Env: tt.env}
			assert.Equal(t, tt.expect, cfg.IsProduction())
		})
	}
}

func TestConfig_Validate_MissingPort(t *testing.T) {
	cfg := &Config{Port: "", RedisURL: "redis://localhost:6379", ClerkJWKSURL: "https://example.com"}
	err := cfg.validate()
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "PORT")
}

func TestConfig_Validate_MissingRedis(t *testing.T) {
	cfg := &Config{Port: "8080", RedisURL: "", ClerkJWKSURL: "https://example.com"}
	err := cfg.validate()
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "REDIS_URL")
}

func TestConfig_Validate_MissingJWKS(t *testing.T) {
	cfg := &Config{Port: "8080", RedisURL: "redis://localhost:6379", ClerkJWKSURL: ""}
	err := cfg.validate()
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "CLERK_JWKS_URL")
}

func TestConfig_Validate_Valid(t *testing.T) {
	cfg := &Config{Port: "8080", RedisURL: "redis://localhost:6379", ClerkJWKSURL: "https://example.com"}
	err := cfg.validate()
	assert.NoError(t, err)
}
