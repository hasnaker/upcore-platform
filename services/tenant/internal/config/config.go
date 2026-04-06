package config

import (
	"fmt"
	"strings"
	"time"

	"github.com/spf13/viper"
)

// Config holds all configuration for the tenant service.
type Config struct {
	// HTTP
	Port            string        `mapstructure:"PORT"`
	Env             string        `mapstructure:"APP_ENV"`
	LogLevel        string        `mapstructure:"LOG_LEVEL"`
	ShutdownTimeout time.Duration `mapstructure:"SHUTDOWN_TIMEOUT"`
	RequestTimeout  time.Duration `mapstructure:"REQUEST_TIMEOUT"`

	// Database
	DatabaseURL     string `mapstructure:"DATABASE_URL"`
	DatabaseMaxOpen int    `mapstructure:"DATABASE_MAX_OPEN"`
	DatabaseMaxIdle int    `mapstructure:"DATABASE_MAX_IDLE"`

	// Azure Service Bus
	ServiceBusConnection string `mapstructure:"SERVICE_BUS_CONNECTION_STRING"`
	ServiceBusNamespace  string `mapstructure:"SERVICE_BUS_NAMESPACE"`

	// Billing providers
	StripeSecretKey     string `mapstructure:"STRIPE_SECRET_KEY"`
	StripeWebhookSecret string `mapstructure:"STRIPE_WEBHOOK_SECRET"`
	IyzicoAPIKey        string `mapstructure:"IYZICO_API_KEY"`
	IyzicoSecretKey     string `mapstructure:"IYZICO_SECRET_KEY"`
	IyzicoWebhookSecret string `mapstructure:"IYZICO_WEBHOOK_SECRET"`

	// Tenant lifecycle
	TrialDays int `mapstructure:"TRIAL_DAYS"`

	// JWT (for validation)
	JWTIssuer   string `mapstructure:"JWT_ISSUER"`
	JWTAudience string `mapstructure:"JWT_AUDIENCE"`

	// CORS
	CORSAllowedOrigins []string `mapstructure:"CORS_ALLOWED_ORIGINS"`
}

// Load reads configuration from environment variables (with optional .env file)
// applying sensible defaults.
func Load() (*Config, error) {
	v := viper.New()

	// Defaults
	v.SetDefault("PORT", "8002")
	v.SetDefault("APP_ENV", "development")
	v.SetDefault("LOG_LEVEL", "info")
	v.SetDefault("SHUTDOWN_TIMEOUT", 10*time.Second)
	v.SetDefault("REQUEST_TIMEOUT", 30*time.Second)
	v.SetDefault("DATABASE_URL", "postgres://upcore:upcore@localhost:5432/upcore_dev?sslmode=disable")
	v.SetDefault("DATABASE_MAX_OPEN", 25)
	v.SetDefault("DATABASE_MAX_IDLE", 5)
	v.SetDefault("TRIAL_DAYS", 14)
	v.SetDefault("JWT_ISSUER", "upcore-auth")
	v.SetDefault("JWT_AUDIENCE", "upcore-api")
	v.SetDefault("CORS_ALLOWED_ORIGINS", []string{"*"})

	// Env binding
	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	v.AutomaticEnv()

	// Optional .env file
	v.SetConfigFile(".env")
	v.SetConfigType("env")
	_ = v.ReadInConfig()

	cfg := &Config{}
	if err := v.Unmarshal(cfg); err != nil {
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
	if c.TrialDays < 0 {
		return fmt.Errorf("TRIAL_DAYS must be >= 0")
	}
	return nil
}

// IsProduction returns true when APP_ENV is production.
func (c *Config) IsProduction() bool {
	return strings.EqualFold(c.Env, "production")
}
