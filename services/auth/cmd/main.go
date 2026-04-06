package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"github.com/upcore/auth/internal/clerk"
	"github.com/upcore/auth/internal/config"
	"github.com/upcore/auth/internal/db"
	"github.com/upcore/auth/internal/handler"
	authjwt "github.com/upcore/auth/internal/jwt"
	"github.com/upcore/auth/internal/rbac"
	"github.com/upcore/auth/internal/repository"
	"github.com/upcore/auth/internal/service"
)

func main() {
	setupLogger()

	cfg, err := config.Load()
	if err != nil {
		log.Fatal().Err(err).Msg("load config")
	}
	setupLogLevel(cfg.LogLevel)

	database, err := db.ConnectWithOpts(cfg.DatabaseURL, cfg.DatabaseMaxOpen, cfg.DatabaseMaxIdle, 5*time.Minute)
	if err != nil {
		log.Fatal().Err(err).Msg("connect database")
	}
	defer database.Close()
	log.Info().Msg("database connected")

	// Repositories
	userRepo := repository.NewUserRepo(database)
	sessionRepo := repository.NewSessionRepo(database)
	roleRepo := repository.NewRoleRepo(database)

	// Services
	authSvc := service.NewAuthService(userRepo, roleRepo, sessionRepo, nil)
	sessionSvc := service.NewSessionService(sessionRepo, cfg.RefreshTTL)

	// Clerk webhook
	webhookSecret := cfg.ClerkWebhookSecret
	if webhookSecret == "" {
		log.Warn().Msg("CLERK_WEBHOOK_SECRET not set; webhook endpoint will reject all requests")
		// Use a dummy base64-encoded secret so verification fails for every request.
		webhookSecret = "whsec_ZHVtbXk="
	}
	verifier, err := clerk.NewSvixVerifier(webhookSecret)
	if err != nil {
		log.Fatal().Err(err).Msg("init svix verifier")
	}
	webhookHandler := handler.NewWebhookHandler(verifier, clerk.NewDispatcher(authSvc))

	// JWT validation
	jwks := authjwt.NewRemoteJWKS(cfg.ClerkJWKSURL, cfg.JWKSCacheTTL)
	validator := authjwt.NewValidator(jwks, cfg.ClerkIssuer, cfg.JWTAudience)

	// RBAC
	policy := rbac.NewPolicy()

	router := handler.Router(&handler.Deps{
		Cfg:            cfg,
		AuthService:    authSvc,
		SessionService: sessionSvc,
		Policy:         policy,
		JWTValidator:   validator,
		WebhookHandler: webhookHandler,
	})

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           router,
		ReadTimeout:       10 * time.Second,
		ReadHeaderTimeout: 5 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	// Start
	go func() {
		log.Info().Str("addr", srv.Addr).Msg("auth service listening")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal().Err(err).Msg("http server")
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Info().Msg("shutting down")

	ctx, cancel := context.WithTimeout(context.Background(), cfg.ShutdownTimeout)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Error().Err(err).Msg("shutdown error")
	}
	log.Info().Msg("auth service stopped")
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
