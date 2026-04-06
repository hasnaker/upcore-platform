package config

import (
	"fmt"
	"strings"
	"time"

	"github.com/spf13/viper"
)

// Config holds all configuration for the assessment service.
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

	// Redis (session state)
	RedisURL      string        `mapstructure:"REDIS_URL"`
	RedisTTL      time.Duration `mapstructure:"REDIS_TTL"`
	RedisPassword string        `mapstructure:"REDIS_PASSWORD"`
	RedisDB       int           `mapstructure:"REDIS_DB"`

	// Azure Service Bus
	ServiceBusConnection string `mapstructure:"SERVICE_BUS_CONNECTION_STRING"`
	ServiceBusNamespace  string `mapstructure:"SERVICE_BUS_NAMESPACE"`

	// Auth service integration
	AuthServiceURL     string        `mapstructure:"AUTH_SERVICE_URL"`
	AuthServiceTimeout time.Duration `mapstructure:"AUTH_SERVICE_TIMEOUT"`

	// Psychometric scoring service
	ScoringServiceURL     string        `mapstructure:"SCORING_SERVICE_URL"`
	ScoringServiceTimeout time.Duration `mapstructure:"SCORING_SERVICE_TIMEOUT"`

	// Session defaults
	SessionTimeLimitMinutes int `mapstructure:"SESSION_TIME_LIMIT_MINUTES"`
	MaxFocusLostCount       int `mapstructure:"MAX_FOCUS_LOST_COUNT"`
	MinTimePerQuestionSec   int `mapstructure:"MIN_TIME_PER_QUESTION_SEC"`

	// CORS
	CORSAllowedOrigins []string `mapstructure:"CORS_ALLOWED_ORIGINS"`
}

// Load reads configuration from environment variables (with optional .env file)
// applying sensible defaults.
func Load() (*Config, error) {
	v := viper.New()

	v.SetDefault("PORT", "8012")
	v.SetDefault("APP_ENV", "development")
	v.SetDefault("LOG_LEVEL", "info")
	v.SetDefault("SHUTDOWN_TIMEOUT", 10*time.Second)
	v.SetDefault("REQUEST_TIMEOUT", 60*time.Second)
	v.SetDefault("DATABASE_URL", "postgres://upcore:upcore@localhost:5432/upcore_dev?sslmode=disable")
	v.SetDefault("DATABASE_MAX_OPEN", 25)
	v.SetDefault("DATABASE_MAX_IDLE", 5)
	v.SetDefault("REDIS_URL", "localhost:6379")
	v.SetDefault("REDIS_TTL", 24*time.Hour)
	v.SetDefault("REDIS_PASSWORD", "")
	v.SetDefault("REDIS_DB", 0)
	v.SetDefault("AUTH_SERVICE_URL", "http://localhost:8001")
	v.SetDefault("AUTH_SERVICE_TIMEOUT", 500*time.Millisecond)
	v.SetDefault("SCORING_SERVICE_URL", "http://localhost:8021")
	v.SetDefault("SCORING_SERVICE_TIMEOUT", 30*time.Second)
	v.SetDefault("SESSION_TIME_LIMIT_MINUTES", 90)
	v.SetDefault("MAX_FOCUS_LOST_COUNT", 3)
	v.SetDefault("MIN_TIME_PER_QUESTION_SEC", 2)
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
	if c.RedisURL == "" {
		return fmt.Errorf("REDIS_URL is required")
	}
	return nil
}

// IsProduction returns true when APP_ENV is production.
func (c *Config) IsProduction() bool {
	return strings.EqualFold(c.Env, "production")
}
