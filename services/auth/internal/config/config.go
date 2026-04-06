package config

import (
	"fmt"
	"strings"
	"time"

	"github.com/mitchellh/mapstructure"
	"github.com/spf13/viper"
)

// Config holds all configuration for the auth service.
type Config struct {
	// HTTP
	Port            string        `mapstructure:"PORT"`
	Env             string        `mapstructure:"APP_ENV"`
	LogLevel        string        `mapstructure:"LOG_LEVEL"`
	ShutdownTimeout time.Duration `mapstructure:"SHUTDOWN_TIMEOUT"`
	RequestTimeout  time.Duration `mapstructure:"REQUEST_TIMEOUT"`

	// Database
	DatabaseURL    string `mapstructure:"DATABASE_URL"`
	DatabaseMaxOpen int   `mapstructure:"DATABASE_MAX_OPEN"`
	DatabaseMaxIdle int   `mapstructure:"DATABASE_MAX_IDLE"`

	// Redis
	RedisURL string `mapstructure:"REDIS_URL"`

	// Azure Service Bus
	ServiceBusConnection string `mapstructure:"SERVICE_BUS_CONNECTION_STRING"`
	ServiceBusNamespace  string `mapstructure:"SERVICE_BUS_NAMESPACE"`

	// Clerk
	ClerkWebhookSecret string `mapstructure:"CLERK_WEBHOOK_SECRET"`
	ClerkSecretKey     string `mapstructure:"CLERK_SECRET_KEY"`
	ClerkJWKSURL       string `mapstructure:"CLERK_JWKS_URL"`
	ClerkIssuer        string `mapstructure:"CLERK_ISSUER"`

	// JWT (Upcore-internal token issuance, if used)
	JWTIssuer     string        `mapstructure:"JWT_ISSUER"`
	JWTAudience   string        `mapstructure:"JWT_AUDIENCE"`
	AccessTTL     time.Duration `mapstructure:"ACCESS_TOKEN_TTL"`
	RefreshTTL    time.Duration `mapstructure:"REFRESH_TOKEN_TTL"`
	JWKSCacheTTL  time.Duration `mapstructure:"JWKS_CACHE_TTL"`

	// CORS
	CORSAllowedOrigins []string `mapstructure:"CORS_ALLOWED_ORIGINS"`
}

// Load reads configuration from environment variables (with optional .env file)
// applying sensible defaults.
func Load() (*Config, error) {
	v := viper.New()

	// Defaults
	v.SetDefault("PORT", "8001")
	v.SetDefault("APP_ENV", "development")
	v.SetDefault("LOG_LEVEL", "info")
	v.SetDefault("SHUTDOWN_TIMEOUT", 10*time.Second)
	v.SetDefault("REQUEST_TIMEOUT", 30*time.Second)
	v.SetDefault("DATABASE_URL", "postgres://upcore:upcore@localhost:5432/upcore_dev?sslmode=disable")
	v.SetDefault("DATABASE_MAX_OPEN", 25)
	v.SetDefault("DATABASE_MAX_IDLE", 5)
	v.SetDefault("REDIS_URL", "redis://localhost:6379/0")
	v.SetDefault("CLERK_JWKS_URL", "https://api.clerk.dev/v1/jwks")
	v.SetDefault("CLERK_ISSUER", "https://clerk.upcore.app")
	v.SetDefault("JWT_ISSUER", "upcore-auth")
	v.SetDefault("JWT_AUDIENCE", "upcore-api")
	v.SetDefault("ACCESS_TOKEN_TTL", 15*time.Minute)
	v.SetDefault("REFRESH_TOKEN_TTL", 30*24*time.Hour)
	v.SetDefault("JWKS_CACHE_TTL", time.Hour)
	v.SetDefault("CORS_ALLOWED_ORIGINS", []string{"*"})

	// Env binding
	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	v.AutomaticEnv()

	// Optional .env file
	v.SetConfigFile(".env")
	v.SetConfigType("env")
	_ = v.ReadInConfig() // ignore if missing

	cfg := &Config{}
	decodeHooks := viper.DecodeHook(mapstructure.ComposeDecodeHookFunc(
		mapstructure.StringToTimeDurationHookFunc(),
		mapstructure.StringToSliceHookFunc(","),
	))
	if err := v.Unmarshal(cfg, decodeHooks); err != nil {
		return nil, fmt.Errorf("unmarshal config: %w", err)
	}

	if err := cfg.validate(); err != nil {
		return nil, err
	}
	return cfg, nil
}

func (c *Config) validate() error {
	if c.DatabaseURL == "" {
		return fmt.Errorf("DATABASE_URL is required")
	}
	if c.Port == "" {
		return fmt.Errorf("PORT is required")
	}
	return nil
}

// IsProduction returns true when APP_ENV is production.
func (c *Config) IsProduction() bool {
	return strings.EqualFold(c.Env, "production")
}
