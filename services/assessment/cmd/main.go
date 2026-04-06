package main

import (
	"context"
	"errors"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"github.com/upcore/assessment/internal/config"
	"github.com/upcore/assessment/internal/db"
	"github.com/upcore/assessment/internal/event"
	"github.com/upcore/assessment/internal/handler"
	"github.com/upcore/assessment/internal/middleware"
	"github.com/upcore/assessment/internal/repository"
	"github.com/upcore/assessment/internal/scoring"
	"github.com/upcore/assessment/internal/service"
)

func main() {
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	logger := log.With().Str("service", "assessment").Logger()

	cfg, err := config.Load()
	if err != nil {
		logger.Fatal().Err(err).Msg("load config")
	}
	if lvl, err := zerolog.ParseLevel(cfg.LogLevel); err == nil {
		zerolog.SetGlobalLevel(lvl)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Database
	sqlDB, err := db.Open(ctx, db.Config{
		DSN:         cfg.DatabaseURL,
		MaxOpenConn: cfg.DatabaseMaxOpen,
		MaxIdleConn: cfg.DatabaseMaxIdle,
	})
	if err != nil {
		logger.Fatal().Err(err).Msg("open database")
	}
	defer func() { _ = db.Close(sqlDB) }()
	logger.Info().Msg("database connected")

	// Redis
	rdb, err := db.OpenRedis(ctx, db.RedisConfig{
		Addr:     cfg.RedisURL,
		Password: cfg.RedisPassword,
		DB:       cfg.RedisDB,
	})
	if err != nil {
		logger.Fatal().Err(err).Msg("open redis")
	}
	defer func() { _ = db.CloseRedis(rdb) }()
	logger.Info().Msg("redis connected")

	// Event publisher (no-op until Service Bus is wired)
	publisher := event.NewNopPublisher(logger)
	defer func() { _ = publisher.Close() }()

	// Repositories
	assessmentRepo := repository.NewAssessmentRepository(sqlDB)
	sessionRepo := repository.NewSessionRepository(sqlDB)
	responseRepo := repository.NewResponseRepository(sqlDB)
	scoreRepo := repository.NewScoreRepository(sqlDB)
	sessionStateRepo := repository.NewSessionStateRepository(rdb, cfg.RedisTTL)

	// Scoring client
	scoringClient := scoring.NewHTTPClient(cfg.ScoringServiceURL, cfg.ScoringServiceTimeout, logger)

	// Services
	assessmentSvc := service.NewAssessmentService(
		assessmentRepo,
		sessionRepo,
		responseRepo,
		scoreRepo,
		sessionStateRepo,
		scoringClient,
		publisher,
		cfg,
		logger,
	)

	// Auth checker
	authChecker := middleware.NewAuthChecker(cfg.AuthServiceURL, cfg.AuthServiceTimeout)

	// HTTP
	r := handler.NewRouter(&handler.Deps{
		Cfg:               cfg,
		AssessmentService: assessmentSvc,
		AuthChecker:       authChecker,
		Log:               logger,
	})

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           r,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       cfg.RequestTimeout,
		WriteTimeout:      cfg.RequestTimeout + 5*time.Second,
		IdleTimeout:       90 * time.Second,
	}

	errCh := make(chan error, 1)
	go func() {
		logger.Info().Str("addr", srv.Addr).Msg("assessment service listening")
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
		}
	}()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, os.Interrupt, syscall.SIGTERM)

	select {
	case sig := <-sigCh:
		logger.Info().Str("signal", sig.String()).Msg("shutdown signal received")
	case err := <-errCh:
		logger.Error().Err(err).Msg("http server error")
	}

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), cfg.ShutdownTimeout)
	defer shutdownCancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		logger.Error().Err(err).Msg("graceful shutdown failed")
	}
	logger.Info().Msg("assessment service stopped")
}
