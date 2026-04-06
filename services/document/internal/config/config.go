package config

import (
	"fmt"
	"strings"
	"time"

	"github.com/spf13/viper"
)

// Config holds all configuration for the document service.
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

	// Azure Blob Storage
	BlobAccountName string `mapstructure:"AZURE_BLOB_ACCOUNT_NAME"`
	BlobAccountKey  string `mapstructure:"AZURE_BLOB_ACCOUNT_KEY"`
	BlobContainer   string `mapstructure:"AZURE_BLOB_CONTAINER"`
	BlobEndpoint    string `mapstructure:"AZURE_BLOB_ENDPOINT"`

	// Upload limits
	MaxUploadMB     int64 `mapstructure:"MAX_UPLOAD_MB"`
	SASReadTTLMin   int   `mapstructure:"SAS_READ_TTL_MIN"`
	SASWriteTTLMin  int   `mapstructure:"SAS_WRITE_TTL_MIN"`
	ExpiryAlertDays int   `mapstructure:"EXPIRY_ALERT_DAYS"`

	// E-İmza providers (stubs for V1)
	EImzalaAPIKey   string `mapstructure:"EIMZALA_API_KEY"`
	EImzalaBaseURL  string `mapstructure:"EIMZALA_BASE_URL"`
	KamuSMAPIKey    string `mapstructure:"KAMU_SM_API_KEY"`
	EDevletClientID string `mapstructure:"EDEVLET_CLIENT_ID"`

	// JWT (for validation via API gateway)
	JWTIssuer   string `mapstructure:"JWT_ISSUER"`
	JWTAudience string `mapstructure:"JWT_AUDIENCE"`

	// CORS
	CORSAllowedOrigins []string `mapstructure:"CORS_ALLOWED_ORIGINS"`
}

// Load reads configuration from environment (with optional .env) and applies
// sensible defaults for local development.
func Load() (*Config, error) {
	v := viper.New()

	// Defaults
	v.SetDefault("PORT", "8006")
	v.SetDefault("APP_ENV", "development")
	v.SetDefault("LOG_LEVEL", "info")
	v.SetDefault("SHUTDOWN_TIMEOUT", 10*time.Second)
	v.SetDefault("REQUEST_TIMEOUT", 60*time.Second)
	v.SetDefault("DATABASE_URL", "postgres://upcore:upcore@localhost:5432/upcore_dev?sslmode=disable")
	v.SetDefault("DATABASE_MAX_OPEN", 25)
	v.SetDefault("DATABASE_MAX_IDLE", 5)
	v.SetDefault("AZURE_BLOB_CONTAINER", "documents")
	v.SetDefault("MAX_UPLOAD_MB", 50)
	v.SetDefault("SAS_READ_TTL_MIN", 15)
	v.SetDefault("SAS_WRITE_TTL_MIN", 15)
	v.SetDefault("EXPIRY_ALERT_DAYS", 30)
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
	if c.MaxUploadMB <= 0 {
		return fmt.Errorf("MAX_UPLOAD_MB must be > 0")
	}
	if c.SASReadTTLMin <= 0 {
		return fmt.Errorf("SAS_READ_TTL_MIN must be > 0")
	}
	if c.ExpiryAlertDays <= 0 {
		return fmt.Errorf("EXPIRY_ALERT_DAYS must be > 0")
	}
	return nil
}

// IsProduction returns true when APP_ENV is production.
func (c *Config) IsProduction() bool {
	return strings.EqualFold(c.Env, "production")
}

// MaxUploadBytes returns the enforced upload limit in bytes.
func (c *Config) MaxUploadBytes() int64 {
	return c.MaxUploadMB * 1024 * 1024
}
