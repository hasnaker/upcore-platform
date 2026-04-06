package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"github.com/upcore/api-gateway/internal/config"
	"github.com/upcore/api-gateway/internal/event"
	"github.com/upcore/api-gateway/internal/health"
	gatewayjwt "github.com/upcore/api-gateway/internal/jwt"
	"github.com/upcore/api-gateway/internal/middleware"
	"github.com/upcore/api-gateway/internal/proxy"
	"github.com/upcore/api-gateway/internal/ratelimit"
)

func main() {
	setupLogger()

	cfg, err := config.Load()
	if err != nil {
		log.Fatal().Err(err).Msg("load config")
	}
	setupLogLevel(cfg.LogLevel)

	// Load route configuration
	routes, err := config.LoadRoutes(cfg.RoutesConfigPath)
	if err != nil {
		log.Fatal().Err(err).Str("path", cfg.RoutesConfigPath).Msg("load routes")
	}
	log.Info().Int("routes", len(routes)).Msg("routes loaded")

	// Redis client
	redisOpts, err := redis.ParseURL(cfg.RedisURL)
	if err != nil {
		log.Fatal().Err(err).Msg("parse redis URL")
	}
	redisClient := redis.NewClient(redisOpts)
	defer redisClient.Close()

	// Verify Redis connectivity
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	if err := redisClient.Ping(ctx).Err(); err != nil {
		log.Fatal().Err(err).Msg("redis ping")
	}
	cancel()
	log.Info().Msg("redis connected")

	// JWKS + JWT validator
	jwksCache := gatewayjwt.NewJWKSCache(cfg.ClerkJWKSURL, cfg.JWKSCacheTTL)
	jwtValidator := gatewayjwt.NewValidator(jwksCache, cfg.ClerkIssuer, cfg.JWTAudience)

	// Rate limiter
	redisStore := ratelimit.NewRedisStore(redisClient)
	limiter := ratelimit.NewLimiter(redisStore, cfg.RateLimitWindowSec)

	// Rate limit policy store
	policyStore := ratelimit.NewPolicyStore(ratelimit.Policy{
		Path:      "*",
		PerUser:   cfg.RateLimitPerUser,
		PerTenant: cfg.RateLimitPerTenant,
	})
	// Register route-specific policies
	for _, r := range routes {
		if r.RateLimit.PerUser > 0 || r.RateLimit.PerTenant > 0 {
			policyStore.Register(r.PathPrefix, r.RateLimit.PerUser, r.RateLimit.PerTenant)
		}
	}

	// Event publisher
	var publisher *event.Publisher
	if cfg.ServiceBusConnection != "" {
		sender, err := event.NewServiceBusSender(cfg.ServiceBusConnection)
		if err != nil {
			log.Warn().Err(err).Msg("service bus sender init failed, using log publisher")
			publisher = event.NewLogPublisher()
		} else {
			publisher = event.NewPublisher(sender)
		}
	} else if cfg.IsProduction() {
		log.Warn().Msg("SERVICE_BUS_CONNECTION_STRING not set, using noop publisher")
		publisher = event.NewNoopPublisher()
	} else {
		publisher = event.NewLogPublisher()
	}
	defer publisher.Close()

	// Upstream config
	upstreamCfg := proxy.UpstreamConfig{
		MaxFailures: cfg.CircuitBreakerThreshold,
		Timeout:     cfg.CircuitBreakerTimeout,
	}

	// Create gateway
	gateway, err := proxy.NewGateway(routes, upstreamCfg, cfg.UpstreamTimeout)
	if err != nil {
		log.Fatal().Err(err).Msg("create gateway")
	}

	// Start health checks for all upstreams
	healthCtx, healthCancel := context.WithCancel(context.Background())
	defer healthCancel()
	for _, u := range gateway.Upstreams() {
		u.StartHealthCheck(healthCtx, 30*time.Second)
	}

	// Build auth skip paths from route config
	skipPaths := buildSkipPaths(routes)

	// Setup router
	router := setupRouter(cfg, gateway, jwtValidator, limiter, policyStore, redisClient, publisher, skipPaths)

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           router,
		ReadTimeout:       10 * time.Second,
		ReadHeaderTimeout: 5 * time.Second,
		WriteTimeout:      60 * time.Second,
		IdleTimeout:       120 * time.Second,
		MaxHeaderBytes:    1 << 20, // 1MB
	}

	// Start server
	go func() {
		log.Info().Str("addr", srv.Addr).Msg("api gateway listening")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal().Err(err).Msg("http server")
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Info().Msg("shutting down")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), cfg.ShutdownTimeout)
	defer shutdownCancel()

	healthCancel() // Stop health checks

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Error().Err(err).Msg("shutdown error")
	}
	log.Info().Msg("api gateway stopped")
}

func setupRouter(
	cfg *config.Config,
	gateway *proxy.Gateway,
	jwtValidator *gatewayjwt.Validator,
	limiter *ratelimit.Limiter,
	policyStore *ratelimit.PolicyStore,
	redisClient *redis.Client,
	publisher *event.Publisher,
	skipPaths []string,
) http.Handler {
	r := chi.NewRouter()

	// Middleware chain (outermost first):
	// Recovery → CORS → Correlation → Logger → Gzip → Auth → Tenant → RateLimit → Proxy
	logger := log.Logger
	r.Use(middleware.RecoveryMiddleware(logger))
	r.Use(middleware.CORSMiddleware(cfg.CORSAllowedOrigins))
	r.Use(middleware.CorrelationMiddleware())
	r.Use(middleware.LoggingMiddleware(logger))
	r.Use(middleware.GzipMiddleware())
	r.Use(middleware.AuthMiddleware(jwtValidator, skipPaths))
	r.Use(middleware.TenantMiddleware())
	r.Use(middleware.RateLimitMiddleware(limiter, policyStore))

	// Health endpoints (not behind middleware chain above, but recovery/cors/correlation are fine)
	r.Get("/health", health.HealthHandler())
	r.Get("/ready", health.ReadinessHandler(redisClient))
	r.Get("/health/upstream", health.AggregateHealthHandler(gateway.Upstreams()))

	// Catch-all: proxy to upstream services
	r.Handle("/*", gateway)

	return r
}

// buildSkipPaths extracts paths that don't require authentication from route config.
func buildSkipPaths(routes []config.RouteConfig) []string {
	paths := []string{
		"/health",
		"/ready",
		"/health/upstream",
		"/metrics",
	}

	for _, r := range routes {
		if !r.AuthRequired {
			paths = append(paths, r.PathPrefix+"*")
		}
	}

	return paths
}

func setupLogger() {
	zerolog.TimeFieldFormat = time.RFC3339Nano
	log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stdout, TimeFormat: time.RFC3339})
}

func setupLogLevel(level string) {
	lvl, err := zerolog.ParseLevel(strings.ToLower(level))
	if err != nil {
		lvl = zerolog.InfoLevel
	}
	zerolog.SetGlobalLevel(lvl)
}
