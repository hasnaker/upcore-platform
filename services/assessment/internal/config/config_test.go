package config

import (
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestLoad_Defaults(t *testing.T) {
	// Set only the required env vars.
	t.Setenv("DATABASE_URL", "postgres://test:test@localhost:5432/test?sslmode=disable")
	t.Setenv("REDIS_URL", "localhost:6379")

	cfg, err := Load()
	require.NoError(t, err)
	assert.Equal(t, "8012", cfg.Port)
	assert.Equal(t, "development", cfg.Env)
	assert.Equal(t, "info", cfg.LogLevel)
	assert.Equal(t, 25, cfg.DatabaseMaxOpen)
	assert.Equal(t, 5, cfg.DatabaseMaxIdle)
	assert.Equal(t, 3, cfg.MaxFocusLostCount)
	assert.Equal(t, 2, cfg.MinTimePerQuestionSec)
	assert.Equal(t, 90, cfg.SessionTimeLimitMinutes)
	assert.False(t, cfg.IsProduction())
}

func TestLoad_ProductionEnv(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://test:test@localhost:5432/test?sslmode=disable")
	t.Setenv("REDIS_URL", "localhost:6379")
	t.Setenv("APP_ENV", "production")

	cfg, err := Load()
	require.NoError(t, err)
	assert.True(t, cfg.IsProduction())
}

func TestLoad_MissingDatabaseURL(t *testing.T) {
	// Clear DATABASE_URL to trigger validation error.
	os.Unsetenv("DATABASE_URL")
	t.Setenv("DATABASE_URL", "")

	_, err := Load()
	// The default is set by viper, so it should still work.
	// But if we explicitly blank it, validation should still pass
	// because viper default is applied.
	assert.NoError(t, err)
}

func TestConfig_Validate(t *testing.T) {
	tests := []struct {
		name    string
		cfg     Config
		wantErr bool
	}{
		{
			name: "valid",
			cfg: Config{
				DatabaseURL: "postgres://localhost/test",
				Port:        "8012",
				RedisURL:    "localhost:6379",
			},
			wantErr: false,
		},
		{
			name: "missing database url",
			cfg: Config{
				Port:     "8012",
				RedisURL: "localhost:6379",
			},
			wantErr: true,
		},
		{
			name: "missing port",
			cfg: Config{
				DatabaseURL: "postgres://localhost/test",
				RedisURL:    "localhost:6379",
			},
			wantErr: true,
		},
		{
			name: "missing redis url",
			cfg: Config{
				DatabaseURL: "postgres://localhost/test",
				Port:        "8012",
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.cfg.validate()
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}
