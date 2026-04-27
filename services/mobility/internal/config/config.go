// Package config provides configuration loading for the mobility service.
package config

import (
	"fmt"
	"strings"
	"time"

	"github.com/spf13/viper"
)

// Config holds all configuration for the mobility service.
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

	// Upstream
	AuthServiceURL     string        `mapstructure:"AUTH_SERVICE_URL"`
	AuthServiceTimeout time.Duration `mapstructure:"AUTH_SERVICE_TIMEOUT"`

	// Business rules
	MinTenureDays          int     `mapstructure:"MIN_TENURE_DAYS"`           // İç rotasyon için asgari kıdem
	MinPerformanceRating   float64 `mapstructure:"MIN_PERFORMANCE_RATING"`    // Succession havuzu için asgari
	SuccessionPoolMaxSize  int     `mapstructure:"SUCCESSION_POOL_MAX_SIZE"`  // Pozisyon başına aday üst sınırı
	CareerPathRecommendK   int     `mapstructure:"CAREER_PATH_RECOMMEND_K"`   // Önerilen K kariyer yolu
	RotationCooldownDays   int     `mapstructure:"ROTATION_COOLDOWN_DAYS"`    // Rotasyon sonrası bekleme süresi

	// CORS
	CORSAllowedOrigins []string `mapstructure:"CORS_ALLOWED_ORIGINS"`
}

// Load reads configuration from environment variables applying sensible defaults.
func Load() (*Config, error) {
	v := viper.New()

	v.SetDefault("PORT", "8013")
	v.SetDefault("APP_ENV", "development")
	v.SetDefault("LOG_LEVEL", "info")
	v.SetDefault("SHUTDOWN_TIMEOUT", 10*time.Second)
	v.SetDefault("REQUEST_TIMEOUT", 30*time.Second)
	v.SetDefault("DATABASE_URL", "postgres://upcore:upcore@localhost:5432/upcore_dev?sslmode=disable")
	v.SetDefault("DATABASE_MAX_OPEN", 25)
	v.SetDefault("DATABASE_MAX_IDLE", 5)
	v.SetDefault("AUTH_SERVICE_URL", "http://localhost:8001")
	v.SetDefault("AUTH_SERVICE_TIMEOUT", 500*time.Millisecond)
	v.SetDefault("MIN_TENURE_DAYS", 180)
	v.SetDefault("MIN_PERFORMANCE_RATING", 3.5)
	v.SetDefault("SUCCESSION_POOL_MAX_SIZE", 5)
	v.SetDefault("CAREER_PATH_RECOMMEND_K", 3)
	v.SetDefault("ROTATION_COOLDOWN_DAYS", 365)
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
	if c.Port == "" {
		return fmt.Errorf("PORT is required")
	}
	if c.DatabaseURL == "" {
		return fmt.Errorf("DATABASE_URL is required")
	}
	return nil
}
