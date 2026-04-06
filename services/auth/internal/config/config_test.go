package config

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestLoad_Defaults(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://a:b@localhost:5432/db?sslmode=disable")

	cfg, err := Load()
	require.NoError(t, err)
	assert.Equal(t, "8001", cfg.Port)
	assert.Equal(t, 15*time.Minute, cfg.AccessTTL)
	assert.Equal(t, 30*24*time.Hour, cfg.RefreshTTL)
	assert.Equal(t, time.Hour, cfg.JWKSCacheTTL)
	assert.Equal(t, "development", cfg.Env)
	assert.False(t, cfg.IsProduction())
}

func TestLoad_Overrides(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://a:b@localhost:5432/db")
	t.Setenv("PORT", "9999")
	t.Setenv("APP_ENV", "production")
	t.Setenv("ACCESS_TOKEN_TTL", "1h")
	t.Setenv("CORS_ALLOWED_ORIGINS", "https://a.com,https://b.com")

	cfg, err := Load()
	require.NoError(t, err)
	assert.Equal(t, "9999", cfg.Port)
	assert.True(t, cfg.IsProduction())
	assert.Equal(t, time.Hour, cfg.AccessTTL)
	assert.ElementsMatch(t, []string{"https://a.com", "https://b.com"}, cfg.CORSAllowedOrigins)
}

func TestLoad_MissingDatabaseURL(t *testing.T) {
	t.Setenv("DATABASE_URL", "")
	// viper will fall back to default when env is empty string; simulate truly missing by setting empty
	// but config sets a default anyway. Exercise validate() by manually zeroing DatabaseURL on the cfg.
	cfg := &Config{Port: "8001", DatabaseURL: ""}
	assert.Error(t, cfg.validate())
}

func TestIsProduction(t *testing.T) {
	assert.True(t, (&Config{Env: "production"}).IsProduction())
	assert.True(t, (&Config{Env: "PRODUCTION"}).IsProduction())
	assert.False(t, (&Config{Env: "dev"}).IsProduction())
}
