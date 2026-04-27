package config

import (
	"fmt"
	"strings"
	"time"

	"github.com/mitchellh/mapstructure"
	"github.com/spf13/viper"
)

// Config holds all configuration for the API gateway service.
type Config struct {
	// HTTP
	Port            string        `mapstructure:"PORT"`
	Env             string        `mapstructure:"APP_ENV"`
	LogLevel        string        `mapstructure:"LOG_LEVEL"`
	ShutdownTimeout time.Duration `mapstructure:"SHUTDOWN_TIMEOUT"`
	RequestTimeout  time.Duration `mapstructure:"REQUEST_TIMEOUT"`

	// Redis
	RedisURL string `mapstructure:"REDIS_URL"`

	// Azure Service Bus
	ServiceBusConnection string `mapstructure:"SERVICE_BUS_CONNECTION_STRING"`

	// Clerk JWT validation
	ClerkJWKSURL string `mapstructure:"CLERK_JWKS_URL"`
	ClerkIssuer  string `mapstructure:"CLERK_ISSUER"`
	JWTAudience  string `mapstructure:"JWT_AUDIENCE"`
	JWKSCacheTTL time.Duration `mapstructure:"JWKS_CACHE_TTL"`

	// CORS
	// Comma-separated list of exact origins + single-label wildcard patterns
	// (e.g. "https://app.upcore.io,https://*.upcore.io"). Never use "*" when
	// AllowCredentials=true — startup will panic.
	CORSAllowedOrigins []string `mapstructure:"CORS_ALLOWED_ORIGINS"`

	// Rate Limiting
	RateLimitPerUser   int `mapstructure:"RATE_LIMIT_PER_USER"`
	RateLimitPerTenant int `mapstructure:"RATE_LIMIT_PER_TENANT"`
	RateLimitWindowSec int `mapstructure:"RATE_LIMIT_WINDOW_SEC"`
	// RateLimitMode: "fail_closed" (default, reject on Redis down) or
	// "fail_open_local" (use in-memory per-tenant token bucket fallback).
	// "fail_open" is rejected — it is a DoS vector.
	RateLimitMode                      string        `mapstructure:"RATE_LIMIT_MODE"`
	RateLimitBreakerConsecutiveFails   int           `mapstructure:"RATE_LIMIT_BREAKER_CONSECUTIVE_FAILS"`
	RateLimitBreakerOpenDuration       time.Duration `mapstructure:"RATE_LIMIT_BREAKER_OPEN_DURATION"`

	// Routes
	RoutesConfigPath string `mapstructure:"ROUTES_CONFIG_PATH"`

	// Upstream
	UpstreamTimeout         time.Duration `mapstructure:"UPSTREAM_TIMEOUT"`
	CircuitBreakerThreshold uint32        `mapstructure:"CIRCUIT_BREAKER_THRESHOLD"`
	CircuitBreakerTimeout   time.Duration `mapstructure:"CIRCUIT_BREAKER_TIMEOUT"`

	// Metrics
	MetricsAllowedCIDRs []string `mapstructure:"METRICS_ALLOWED_CIDRS"`
}

// Load reads configuration from environment variables (with optional .env file)
// applying sensible defaults.
func Load() (*Config, error) {
	v := viper.New()

	// Defaults
	v.SetDefault("PORT", "8080")
	v.SetDefault("APP_ENV", "development")
	v.SetDefault("LOG_LEVEL", "info")
	v.SetDefault("SHUTDOWN_TIMEOUT", 15*time.Second)
	v.SetDefault("REQUEST_TIMEOUT", 30*time.Second)
	v.SetDefault("REDIS_URL", "redis://localhost:6379/0")
	v.SetDefault("CLERK_JWKS_URL", "https://api.clerk.dev/v1/jwks")
	v.SetDefault("CLERK_ISSUER", "https://clerk.upcore.app")
	v.SetDefault("JWT_AUDIENCE", "upcore-api")
	v.SetDefault("JWKS_CACHE_TTL", time.Hour)
	// No default for CORS_ALLOWED_ORIGINS: the middleware loader picks the
	// dev/prod default based on APP_ENV. A literal "*" is rejected because
	// AllowCredentials=true is required for our JWT cookie flow.
	v.SetDefault("CORS_ALLOWED_ORIGINS", []string{})
	v.SetDefault("RATE_LIMIT_PER_USER", 100)
	v.SetDefault("RATE_LIMIT_PER_TENANT", 1000)
	v.SetDefault("RATE_LIMIT_WINDOW_SEC", 60)
	v.SetDefault("RATE_LIMIT_MODE", "fail_closed")
	v.SetDefault("RATE_LIMIT_BREAKER_CONSECUTIVE_FAILS", 5)
	v.SetDefault("RATE_LIMIT_BREAKER_OPEN_DURATION", 30*time.Second)
	v.SetDefault("ROUTES_CONFIG_PATH", "config/routes.yaml")
	v.SetDefault("UPSTREAM_TIMEOUT", 30*time.Second)
	v.SetDefault("CIRCUIT_BREAKER_THRESHOLD", 5)
	v.SetDefault("CIRCUIT_BREAKER_TIMEOUT", 30*time.Second)
	v.SetDefault("METRICS_ALLOWED_CIDRS", []string{"10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16", "127.0.0.0/8"})

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
	if c.Port == "" {
		return fmt.Errorf("PORT is required")
	}
	if c.RedisURL == "" {
		return fmt.Errorf("REDIS_URL is required")
	}
	if c.ClerkJWKSURL == "" {
		return fmt.Errorf("CLERK_JWKS_URL is required")
	}
	switch strings.ToLower(strings.TrimSpace(c.RateLimitMode)) {
	case "", "fail_closed", "fail_open_local":
		// ok
	case "fail_open":
		return fmt.Errorf(
			"RATE_LIMIT_MODE=fail_open is not allowed (DoS vector). Use fail_closed or fail_open_local")
	default:
		return fmt.Errorf("RATE_LIMIT_MODE must be one of: fail_closed, fail_open_local (got %q)", c.RateLimitMode)
	}
	return nil
}

// IsProduction returns true when APP_ENV is production.
func (c *Config) IsProduction() bool {
	return strings.EqualFold(c.Env, "production")
}
