// Package config handles env-driven configuration for the bordro service.
package config

import (
	"fmt"
	"strings"
	"time"

	"github.com/spf13/viper"
)

// Config bundles all runtime settings.
type Config struct {
	Port            string        `mapstructure:"PORT"`
	Env             string        `mapstructure:"APP_ENV"`
	LogLevel        string        `mapstructure:"LOG_LEVEL"`
	ShutdownTimeout time.Duration `mapstructure:"SHUTDOWN_TIMEOUT"`
	RequestTimeout  time.Duration `mapstructure:"REQUEST_TIMEOUT"`

	DatabaseURL     string `mapstructure:"DATABASE_URL"`
	DatabaseMaxOpen int    `mapstructure:"DATABASE_MAX_OPEN"`
	DatabaseMaxIdle int    `mapstructure:"DATABASE_MAX_IDLE"`

	CORSAllowedOrigins []string `mapstructure:"CORS_ALLOWED_ORIGINS"`

	// Azure Service Bus
	ServiceBusConnection string `mapstructure:"SERVICE_BUS_CONNECTION_STRING"`
	ServiceBusTopic      string `mapstructure:"SERVICE_BUS_TOPIC"`

	// Observability (OpenTelemetry)
	OTLPEndpoint   string `mapstructure:"OTEL_EXPORTER_OTLP_ENDPOINT"` // "otel-collector:4318"
	ServiceVersion string `mapstructure:"SERVICE_VERSION"`
}

// Load reads config with defaults.
func Load() (*Config, error) {
	v := viper.New()
	v.SetDefault("PORT", "8015")
	v.SetDefault("APP_ENV", "development")
	v.SetDefault("LOG_LEVEL", "info")
	v.SetDefault("SHUTDOWN_TIMEOUT", 10*time.Second)
	v.SetDefault("REQUEST_TIMEOUT", 60*time.Second)
	v.SetDefault("DATABASE_URL", "postgres://upcore:upcore@localhost:5432/upcore_dev?sslmode=disable")
	v.SetDefault("DATABASE_MAX_OPEN", 25)
	v.SetDefault("DATABASE_MAX_IDLE", 5)
	v.SetDefault("CORS_ALLOWED_ORIGINS", []string{"*"})
	v.SetDefault("SERVICE_BUS_TOPIC", "bordro-events")
	v.SetDefault("SERVICE_VERSION", "0.1.0")

	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	v.AutomaticEnv()
	v.SetConfigFile(".env")
	v.SetConfigType("env")
	_ = v.ReadInConfig()

	cfg := &Config{}
	if err := v.Unmarshal(cfg); err != nil {
		return nil, fmt.Errorf("unmarshal config: %w", err)
	}
	if cfg.DatabaseURL == "" {
		return nil, fmt.Errorf("DATABASE_URL required")
	}
	return cfg, nil
}
