// Package config loads runtime configuration for the survey service.
package config

import (
	"fmt"
	"strings"
	"time"

	"github.com/spf13/viper"
)

// Config holds all configuration for the survey service.
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

	// Auth service integration
	AuthServiceURL     string        `mapstructure:"AUTH_SERVICE_URL"`
	AuthServiceTimeout time.Duration `mapstructure:"AUTH_SERVICE_TIMEOUT"`

	// Psychometric scoring integration
	ScoringServiceURL     string        `mapstructure:"SCORING_SERVICE_URL"`
	ScoringServiceTimeout time.Duration `mapstructure:"SCORING_SERVICE_TIMEOUT"`

	// Anonymity
	MinAnonymityN int `mapstructure:"MIN_ANONYMITY_N"`

	// Survey fatigue prevention
	MaxSurveysPerMonth int `mapstructure:"MAX_SURVEYS_PER_MONTH"`
	SkipWeekDays       int `mapstructure:"SKIP_WEEK_DAYS"`

	// Scheduler
	SchedulerIntervalMinutes int           `mapstructure:"SCHEDULER_INTERVAL_MINUTES"`
	InvitationTokenTTLDays   int           `mapstructure:"INVITATION_TOKEN_TTL_DAYS"`
	ReminderCadence          time.Duration `mapstructure:"REMINDER_CADENCE"`
	TenantTimezone           string        `mapstructure:"TENANT_TIMEZONE"`

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

	v.SetDefault("PORT", "8007")
	v.SetDefault("APP_ENV", "development")
	v.SetDefault("LOG_LEVEL", "info")
	v.SetDefault("SHUTDOWN_TIMEOUT", 10*time.Second)
	v.SetDefault("REQUEST_TIMEOUT", 30*time.Second)
	v.SetDefault("DATABASE_URL", "postgres://upcore:upcore@localhost:5432/upcore_dev?sslmode=disable")
	v.SetDefault("DATABASE_MAX_OPEN", 25)
	v.SetDefault("DATABASE_MAX_IDLE", 5)
	v.SetDefault("AUTH_SERVICE_URL", "http://localhost:8001")
	v.SetDefault("AUTH_SERVICE_TIMEOUT", 500*time.Millisecond)
	v.SetDefault("SCORING_SERVICE_URL", "http://localhost:8021")
	v.SetDefault("SCORING_SERVICE_TIMEOUT", 2*time.Second)
	v.SetDefault("MIN_ANONYMITY_N", 5)
	v.SetDefault("MAX_SURVEYS_PER_MONTH", 2)
	v.SetDefault("SKIP_WEEK_DAYS", 7)
	v.SetDefault("SCHEDULER_INTERVAL_MINUTES", 5)
	v.SetDefault("INVITATION_TOKEN_TTL_DAYS", 14)
	v.SetDefault("REMINDER_CADENCE", 72*time.Hour)
	v.SetDefault("TENANT_TIMEZONE", "Europe/Istanbul")
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
	if c.MinAnonymityN < 1 {
		return fmt.Errorf("MIN_ANONYMITY_N must be >= 1")
	}
	if c.SchedulerIntervalMinutes <= 0 {
		return fmt.Errorf("SCHEDULER_INTERVAL_MINUTES must be > 0")
	}
	return nil
}

// IsProduction returns true when APP_ENV is production.
func (c *Config) IsProduction() bool {
	return strings.EqualFold(c.Env, "production")
}
