package config

import (
	"fmt"
	"strings"
	"time"

	"github.com/spf13/viper"
)

// Config holds all configuration for the leave service.
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

	// Observability (OpenTelemetry)
	OTLPEndpoint   string `mapstructure:"OTEL_EXPORTER_OTLP_ENDPOINT"`
	ServiceVersion string `mapstructure:"SERVICE_VERSION"`

	// Leave policy
	CarryOverDefaultDays    int  `mapstructure:"CARRY_OVER_DEFAULT_DAYS"`
	ProRateFirstYear        bool `mapstructure:"PRO_RATE_FIRST_YEAR"`
	TeamOverlapWarnPct      int  `mapstructure:"TEAM_OVERLAP_WARN_PCT"`
	RequireHRApprovalOver   int  `mapstructure:"REQUIRE_HR_APPROVAL_OVER_DAYS"`
	MedicalCertMinDays      int  `mapstructure:"MEDICAL_CERT_MIN_DAYS"`

	// CORS
	CORSAllowedOrigins []string `mapstructure:"CORS_ALLOWED_ORIGINS"`

	// JWT
	JWTIssuer   string `mapstructure:"JWT_ISSUER"`
	JWTAudience string `mapstructure:"JWT_AUDIENCE"`
}

// Load reads configuration from env (+ optional .env) applying sensible defaults.
func Load() (*Config, error) {
	v := viper.New()

	v.SetDefault("PORT", "8005")
	v.SetDefault("APP_ENV", "development")
	v.SetDefault("LOG_LEVEL", "info")
	v.SetDefault("SHUTDOWN_TIMEOUT", 10*time.Second)
	v.SetDefault("REQUEST_TIMEOUT", 30*time.Second)
	v.SetDefault("DATABASE_URL", "postgres://upcore:upcore@localhost:5432/upcore_dev?sslmode=disable")
	v.SetDefault("DATABASE_MAX_OPEN", 25)
	v.SetDefault("DATABASE_MAX_IDLE", 5)
	v.SetDefault("CARRY_OVER_DEFAULT_DAYS", 10)
	v.SetDefault("PRO_RATE_FIRST_YEAR", false)
	v.SetDefault("TEAM_OVERLAP_WARN_PCT", 30)
	v.SetDefault("REQUIRE_HR_APPROVAL_OVER_DAYS", 5)
	v.SetDefault("MEDICAL_CERT_MIN_DAYS", 3)
	v.SetDefault("JWT_ISSUER", "upcore-auth")
	v.SetDefault("JWT_AUDIENCE", "upcore-api")
	v.SetDefault("CORS_ALLOWED_ORIGINS", []string{"*"})
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
	if c.CarryOverDefaultDays < 0 {
		return fmt.Errorf("CARRY_OVER_DEFAULT_DAYS must be >= 0")
	}
	if c.TeamOverlapWarnPct < 0 || c.TeamOverlapWarnPct > 100 {
		return fmt.Errorf("TEAM_OVERLAP_WARN_PCT must be between 0 and 100")
	}
	return nil
}

// IsProduction returns true when APP_ENV is production.
func (c *Config) IsProduction() bool {
	return strings.EqualFold(c.Env, "production")
}
