package main

import (
	"context"
	"errors"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"github.com/upcore/survey/internal/config"
	"github.com/upcore/survey/internal/db"
	"github.com/upcore/survey/internal/event"
	"github.com/upcore/survey/internal/handler"
	"github.com/upcore/survey/internal/middleware"
	"github.com/upcore/survey/internal/repository"
	"github.com/upcore/survey/internal/service"
)

func main() {
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	logger := log.With().Str("service", "survey").Logger()

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

	// Event publisher (no-op until Service Bus is wired)
	publisher := event.NewNopPublisher(logger)
	defer func() { _ = publisher.Close() }()

	// Repositories
	surveyRepo := repository.NewSurveyRepository(sqlDB)
	itemRepo := repository.NewItemRepository(sqlDB)
	scheduleRepo := repository.NewScheduleRepository(sqlDB)
	distRepo := repository.NewDistributionRepository(sqlDB)
	invitationRepo := repository.NewInvitationRepository(sqlDB)
	responseRepo := repository.NewResponseRepository(sqlDB)
	answerRepo := repository.NewAnswerRepository(sqlDB)
	aggregateRepo := repository.NewAggregateRepository(sqlDB)

	// Auth checker
	authChecker := middleware.NewAuthChecker(cfg.AuthServiceURL, cfg.AuthServiceTimeout)

	// Services
	surveySvc := service.NewSurveyService(surveyRepo, itemRepo, publisher, logger)
	scheduleSvc := service.NewScheduleService(scheduleRepo, surveyRepo, publisher, logger)
	distSvc := service.NewDistributionService(distRepo, scheduleRepo, invitationRepo, surveyRepo, publisher, cfg, logger)
	responseSvc := service.NewResponseService(responseRepo, answerRepo, invitationRepo, surveyRepo, itemRepo, publisher, cfg, logger)
	aggSvc := service.NewAggregationService(aggregateRepo, answerRepo, distRepo, itemRepo, publisher, cfg, logger)

	// Background workers
	schedulerWorker := service.NewSchedulerWorker(scheduleRepo, distSvc, cfg, logger)
	reminderWorker := service.NewReminderWorker(invitationRepo, distRepo, publisher, cfg, logger)
	// Sentiment analysis worker — serbest metin yanıtları için sentiment +
	// tema çıkarımı. HeuristicScorer dev fallback; production'da ML service.
	sentimentWorker := service.NewSentimentWorker(sqlDB, service.HeuristicScorer{}, logger)

	// Start workers
	go func() {
		if err := schedulerWorker.Run(ctx); err != nil && !errors.Is(err, context.Canceled) {
			logger.Error().Err(err).Msg("scheduler worker stopped")
		}
	}()
	go func() {
		if err := reminderWorker.Run(ctx); err != nil && !errors.Is(err, context.Canceled) {
			logger.Error().Err(err).Msg("reminder worker stopped")
		}
	}()
	go sentimentWorker.Run(ctx)

	// HTTP router
	r := newRouter(cfg, logger, authChecker, surveySvc, scheduleSvc, distSvc, responseSvc, aggSvc)

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
		logger.Info().Str("addr", srv.Addr).Msg("http server starting")
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

	cancel() // stop workers
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), cfg.ShutdownTimeout)
	defer shutdownCancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		logger.Error().Err(err).Msg("graceful shutdown failed")
	}
	logger.Info().Msg("server shut down cleanly")
}

func newRouter(
	cfg *config.Config,
	logger zerolog.Logger,
	checker *middleware.AuthChecker,
	surveySvc *service.SurveyService,
	scheduleSvc *service.ScheduleService,
	distSvc *service.DistributionService,
	responseSvc *service.ResponseService,
	aggSvc *service.AggregationService,
) http.Handler {
	r := chi.NewRouter()
	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(chimw.StripSlashes)
	r.Use(middleware.RequestLogger(logger))
	r.Use(chimw.Recoverer)
	r.Use(chimw.Timeout(cfg.RequestTimeout))
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   cfg.CORSAllowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Tenant-ID", "X-User-ID", "X-User-Role"},
		AllowCredentials: true,
		MaxAge:           300,
	}))
	r.Use(middleware.TenantInjector)

	surveyH := handler.NewSurveyHandler(surveySvc, logger)
	scheduleH := handler.NewScheduleHandler(scheduleSvc, distSvc, logger)
	distH := handler.NewDistributionHandler(distSvc, logger)
	publicH := handler.NewPublicHandler(responseSvc, logger)
	analyticsH := handler.NewAnalyticsHandler(aggSvc, logger)

	// Health
	r.Get("/health", healthHandler)
	r.Get("/ready", readyHandler)

	// Public token-authenticated endpoints
	r.Route("/api/v1/public/surveys/invitations", func(r chi.Router) {
		r.Get("/{token}", publicH.GetSurveyByToken)
		r.Post("/{token}/submit", publicH.SubmitResponse)
	})

	// Authenticated endpoints
	r.Route("/api/v1", func(r chi.Router) {
		r.Use(middleware.RequireAuth(checker))
		r.Route("/surveys", func(r chi.Router) {
			r.Get("/", surveyH.List)
			r.Post("/", surveyH.Create)
			r.Get("/mine/pending", surveyH.ListPending)
			r.Get("/{code}", surveyH.GetByCode)
			r.Get("/{code}/items", surveyH.GetItems)
			r.Patch("/{id}", surveyH.Update)

			// Schedules
			r.Route("/schedules", func(r chi.Router) {
				r.Get("/", scheduleH.List)
				r.Post("/", scheduleH.Create)
				r.Get("/{id}", scheduleH.Get)
				r.Patch("/{id}", scheduleH.Update)
				r.Post("/{id}/pause", scheduleH.Pause)
				r.Post("/{id}/resume", scheduleH.Resume)
				r.Delete("/{id}", scheduleH.Delete)
				r.Post("/{id}/distribute-now", scheduleH.DistributeNow)
			})

			// Distributions
			r.Route("/distributions", func(r chi.Router) {
				r.Get("/", distH.List)
				r.Get("/{id}", distH.Get)
				r.Post("/{id}/close", distH.Close)
				r.Post("/{id}/remind", distH.Remind)
				r.Get("/{id}/analytics", analyticsH.GetDistributionAnalytics)
			})

			// Analytics
			r.Route("/analytics", func(r chi.Router) {
				r.Get("/trend", analyticsH.GetSurveyTrend)
				r.Get("/burnout-dashboard", analyticsH.GetBurnoutDashboard)
				r.Get("/enps", analyticsH.GetENPS)
			})
		})
	})

	return r
}

func healthHandler(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"status":"ok","service":"survey"}`))
}

func readyHandler(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"status":"ready","service":"survey"}`))
}
