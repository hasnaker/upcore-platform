package config

import (
	"fmt"
	"strings"
	"time"

	"github.com/mitchellh/mapstructure"
	"github.com/spf13/viper"
)

// Config holds all configuration for the audit service.
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

	// Redis
	RedisURL string `mapstructure:"REDIS_URL"`

	// Azure Service Bus
	ServiceBusConnection string `mapstructure:"SERVICE_BUS_CONNECTION_STRING"`
	ServiceBusNamespace  string `mapstructure:"SERVICE_BUS_NAMESPACE"`
	ServiceBusTopic      string `mapstructure:"SERVICE_BUS_TOPIC"`
	ServiceBusSubscr     string `mapstructure:"SERVICE_BUS_SUBSCRIPTION"`

	// Azure Blob Storage
	BlobConnection string `mapstructure:"BLOB_CONNECTION_STRING"`
	BlobContainer  string `mapstructure:"BLOB_CONTAINER"`

	// Ingestion
	IngestBatchSize       int           `mapstructure:"INGEST_BATCH_SIZE"`
	IngestFlushInterval   time.Duration `mapstructure:"INGEST_FLUSH_INTERVAL"`
	IngestBackpressureMax int           `mapstructure:"INGEST_BACKPRESSURE_MAX"`

	// Partitioning / retention
	PartitionMonthsAhead int `mapstructure:"PARTITION_MONTHS_AHEAD"`
	RetentionMonths      int `mapstructure:"RETENTION_MONTHS"`

	// DSR
	DSRDueDays        int           `mapstructure:"DSR_DUE_DAYS"`
	DSRAckTimeout     time.Duration `mapstructure:"DSR_ACK_TIMEOUT"`
	DSRFanoutServices []string      `mapstructure:"DSR_FANOUT_SERVICES"`

	// CORS
	CORSAllowedOrigins []string `mapstructure:"CORS_ALLOWED_ORIGINS"`
}

// Load reads configuration from environment variables with sensible defaults.
func Load() (*Config, error) {
	v := viper.New()

	v.SetDefault("PORT", "8009")
	v.SetDefault("APP_ENV", "development")
	v.SetDefault("LOG_LEVEL", "info")
	v.SetDefault("SHUTDOWN_TIMEOUT", 15*time.Second)
	v.SetDefault("REQUEST_TIMEOUT", 30*time.Second)
	v.SetDefault("DATABASE_URL", "postgres://upcore:upcore@localhost:5432/upcore_dev?sslmode=disable")
	v.SetDefault("DATABASE_MAX_OPEN", 50)
	v.SetDefault("DATABASE_MAX_IDLE", 10)
	v.SetDefault("REDIS_URL", "redis://localhost:6379/0")
	v.SetDefault("SERVICE_BUS_TOPIC", "audit-events-v1")
	v.SetDefault("SERVICE_BUS_SUBSCRIPTION", "audit-service")
	v.SetDefault("BLOB_CONTAINER", "audit-exports")
	v.SetDefault("INGEST_BATCH_SIZE", 500)
	v.SetDefault("INGEST_FLUSH_INTERVAL", 1*time.Second)
	v.SetDefault("INGEST_BACKPRESSURE_MAX", 10000)
	v.SetDefault("PARTITION_MONTHS_AHEAD", 3)
	v.SetDefault("RETENTION_MONTHS", 84) // 7 years
	v.SetDefault("DSR_DUE_DAYS", 30)
	v.SetDefault("DSR_ACK_TIMEOUT", 5*time.Minute)
	v.SetDefault("DSR_FANOUT_SERVICES", []string{
		"auth", "tenant", "employee", "organization", "document",
		"leave", "assessment", "survey", "ats", "intervention",
		"mobility", "notification",
	})
	v.SetDefault("CORS_ALLOWED_ORIGINS", []string{"*"})

	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	v.AutomaticEnv()

	v.SetConfigFile(".env")
	v.SetConfigType("env")
	_ = v.ReadInConfig()

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
	if c.IngestBatchSize <= 0 {
		return fmt.Errorf("INGEST_BATCH_SIZE must be > 0")
	}
	if c.IngestFlushInterval <= 0 {
		return fmt.Errorf("INGEST_FLUSH_INTERVAL must be > 0")
	}
	if c.PartitionMonthsAhead < 1 {
		return fmt.Errorf("PARTITION_MONTHS_AHEAD must be >= 1")
	}
	return nil
}

// IsProduction returns true when APP_ENV is production.
func (c *Config) IsProduction() bool {
	return strings.EqualFold(c.Env, "production")
}
