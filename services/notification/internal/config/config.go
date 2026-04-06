package config

import (
	"fmt"
	"strings"
	"time"

	"github.com/spf13/viper"
)

// Config holds all configuration for the notification service.
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

	// Azure Service Bus (events)
	ServiceBusConnection string `mapstructure:"SERVICE_BUS_CONNECTION_STRING"`
	ServiceBusNamespace  string `mapstructure:"SERVICE_BUS_NAMESPACE"`

	// SendGrid
	SendGridAPIKey     string `mapstructure:"SENDGRID_API_KEY"`
	SendGridFromEmail  string `mapstructure:"SENDGRID_FROM_EMAIL"`
	SendGridFromName   string `mapstructure:"SENDGRID_FROM_NAME"`
	SendGridWebhookKey string `mapstructure:"SENDGRID_WEBHOOK_KEY"`

	// SMTP fallback
	SMTPHost     string `mapstructure:"SMTP_HOST"`
	SMTPPort     int    `mapstructure:"SMTP_PORT"`
	SMTPUsername string `mapstructure:"SMTP_USERNAME"`
	SMTPPassword string `mapstructure:"SMTP_PASSWORD"`

	// Worker tuning
	WorkerConcurrency  int           `mapstructure:"WORKER_CONCURRENCY"`
	MaxRetries         int           `mapstructure:"MAX_RETRIES"`
	RetryInterval      time.Duration `mapstructure:"RETRY_INTERVAL"`
	DailyEmailLimit    int           `mapstructure:"DAILY_EMAIL_LIMIT"`
	BounceSuppressAt   int           `mapstructure:"BOUNCE_SUPPRESS_AT"`
	CircuitBreakerThr  int           `mapstructure:"CIRCUIT_BREAKER_THRESHOLD"`
	CircuitBreakerCool time.Duration `mapstructure:"CIRCUIT_BREAKER_COOLDOWN"`

	// CORS
	CORSAllowedOrigins []string `mapstructure:"CORS_ALLOWED_ORIGINS"`

	// JWT
	JWTIssuer   string `mapstructure:"JWT_ISSUER"`
	JWTAudience string `mapstructure:"JWT_AUDIENCE"`
}

// Load reads configuration from env (+ optional .env) applying sensible defaults.
func Load() (*Config, error) {
	v := viper.New()

	v.SetDefault("PORT", "8010")
	v.SetDefault("APP_ENV", "development")
	v.SetDefault("LOG_LEVEL", "info")
	v.SetDefault("SHUTDOWN_TIMEOUT", 10*time.Second)
	v.SetDefault("REQUEST_TIMEOUT", 30*time.Second)
	v.SetDefault("DATABASE_URL", "postgres://upcore:upcore@localhost:5432/upcore_dev?sslmode=disable")
	v.SetDefault("DATABASE_MAX_OPEN", 25)
	v.SetDefault("DATABASE_MAX_IDLE", 5)
	v.SetDefault("SENDGRID_FROM_EMAIL", "no-reply@upcore.com.tr")
	v.SetDefault("SENDGRID_FROM_NAME", "UpCore")
	v.SetDefault("SMTP_PORT", 587)
	v.SetDefault("WORKER_CONCURRENCY", 10)
	v.SetDefault("MAX_RETRIES", 5)
	v.SetDefault("RETRY_INTERVAL", 30*time.Second)
	v.SetDefault("DAILY_EMAIL_LIMIT", 20)
	v.SetDefault("BOUNCE_SUPPRESS_AT", 3)
	v.SetDefault("CIRCUIT_BREAKER_THRESHOLD", 5)
	v.SetDefault("CIRCUIT_BREAKER_COOLDOWN", 60*time.Second)
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
	if c.SendGridFromEmail == "" {
		return fmt.Errorf("SENDGRID_FROM_EMAIL is required")
	}
	if c.DailyEmailLimit <= 0 {
		return fmt.Errorf("DAILY_EMAIL_LIMIT must be > 0")
	}
	if c.MaxRetries <= 0 {
		return fmt.Errorf("MAX_RETRIES must be > 0")
	}
	return nil
}

// IsProduction returns true when APP_ENV is production.
func (c *Config) IsProduction() bool {
	return strings.EqualFold(c.Env, "production")
}

// HasSendGrid returns true when a SendGrid API key is configured.
func (c *Config) HasSendGrid() bool {
	return strings.TrimSpace(c.SendGridAPIKey) != ""
}

// HasSMTP returns true when SMTP fallback is configured.
func (c *Config) HasSMTP() bool {
	return strings.TrimSpace(c.SMTPHost) != ""
}
