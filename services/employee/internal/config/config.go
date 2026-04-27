package config

import (
	"fmt"
	"strings"
	"time"

	"github.com/spf13/viper"
)

// Config holds all configuration for the employee service.
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
	ServiceBusTopic      string `mapstructure:"SERVICE_BUS_TOPIC"`

	// Observability (OpenTelemetry)
	OTLPEndpoint   string `mapstructure:"OTEL_EXPORTER_OTLP_ENDPOINT"`
	ServiceVersion string `mapstructure:"SERVICE_VERSION"`

	// Auth service integration
	AuthServiceURL     string        `mapstructure:"AUTH_SERVICE_URL"`
	AuthServiceTimeout time.Duration `mapstructure:"AUTH_SERVICE_TIMEOUT"`

	// CSV import limits
	ImportBatchSize int `mapstructure:"IMPORT_BATCH_SIZE"`
	ImportMaxRows   int `mapstructure:"IMPORT_MAX_ROWS"`
	ImportMaxFileMB int `mapstructure:"IMPORT_MAX_FILE_MB"`

	// JWT
	JWTIssuer   string `mapstructure:"JWT_ISSUER"`
	JWTAudience string `mapstructure:"JWT_AUDIENCE"`

	// CORS
	CORSAllowedOrigins []string `mapstructure:"CORS_ALLOWED_ORIGINS"`
}

// Load reads configuration from environment variables (with optional .env file)
// applying sensible defaults.
func Load() (*Config, error) {
	v := viper.New()

	v.SetDefault("PORT", "8003")
	v.SetDefault("APP_ENV", "development")
	v.SetDefault("LOG_LEVEL", "info")
	v.SetDefault("SHUTDOWN_TIMEOUT", 10*time.Second)
	v.SetDefault("REQUEST_TIMEOUT", 30*time.Second)
	v.SetDefault("DATABASE_URL", "postgres://upcore:upcore@localhost:5432/upcore_dev?sslmode=disable")
	v.SetDefault("DATABASE_MAX_OPEN", 25)
	v.SetDefault("DATABASE_MAX_IDLE", 5)
	v.SetDefault("AUTH_SERVICE_URL", "http://localhost:8001")
	v.SetDefault("AUTH_SERVICE_TIMEOUT", 500*time.Millisecond)
	v.SetDefault("SERVICE_BUS_TOPIC", "employee-events")
	v.SetDefault("SERVICE_VERSION", "0.1.0")
	v.SetDefault("IMPORT_BATCH_SIZE", 500)
	v.SetDefault("IMPORT_MAX_ROWS", 10000)
	v.SetDefault("IMPORT_MAX_FILE_MB", 10)
	v.SetDefault("JWT_ISSUER", "upcore-auth")
	v.SetDefault("JWT_AUDIENCE", "upcore-api")
	v.SetDefault("CORS_ALLOWED_ORIGINS", []string{"*"})

	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	v.AutomaticEnv()

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
	if c.ImportBatchSize <= 0 {
		return fmt.Errorf("IMPORT_BATCH_SIZE must be > 0")
	}
	if c.ImportMaxRows <= 0 {
		return fmt.Errorf("IMPORT_MAX_ROWS must be > 0")
	}
	if c.ImportMaxFileMB <= 0 {
		return fmt.Errorf("IMPORT_MAX_FILE_MB must be > 0")
	}
	return nil
}

// IsProduction returns true when APP_ENV is production.
func (c *Config) IsProduction() bool {
	return strings.EqualFold(c.Env, "production")
}
