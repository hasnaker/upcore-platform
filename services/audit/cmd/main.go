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

	"github.com/upcore/audit/internal/config"
	"github.com/upcore/audit/internal/db"
	"github.com/upcore/audit/internal/event"
	"github.com/upcore/audit/internal/handler"
	"github.com/upcore/audit/internal/middleware"
	"github.com/upcore/audit/internal/repository"
	"github.com/upcore/audit/internal/service"
)

func main() {
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	logger := log.With().Str("service", "audit").Logger()

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
	database, err := db.ConnectWithOpts(cfg.DatabaseURL, cfg.DatabaseMaxOpen, cfg.DatabaseMaxIdle, 5*time.Minute)
	if err != nil {
		logger.Fatal().Err(err).Msg("connect database")
	}
	defer database.Close()
	logger.Info().Msg("database connected")

	// Run migrations
	if err := db.RunMigrations(ctx, database, "migrations"); err != nil {
		logger.Warn().Err(err).Msg("run migrations (non-fatal)")
	}

	// Start partition maintenance in background.
	go db.RunPartitionMaintenance(ctx, database,
		[]string{"audit_events", "kvkk_access_log"},
		cfg.PartitionMonthsAhead, cfg.RetentionMonths,
	)

	// Cold-storage archive worker (KVKK 28: 7 yıl saklama).
	// AUDIT_ARCHIVE_BACKEND=local|azure env seçer. Noop (default) skip eder.
	uploader, upErr := service.ResolveUploader()
	if upErr != nil {
		logger.Warn().Err(upErr).Msg("audit archive uploader disabled")
	}
	archiveWorker := service.NewArchiveWorker(database, uploader, logger)
	go archiveWorker.Run(ctx)

	// Event publisher (no-op until Service Bus is wired)
	publisher := event.NewNopPublisher(logger)
	defer func() { _ = publisher.Close() }()

	// Repositories
	eventRepo := repository.NewEventRepository(database)
	kvkkRepo := repository.NewKVKKRepository(database)
	dsrRepo := repository.NewDSRRepository(database)
	exportRepo := repository.NewExportRepository(database)
	consentRepo := repository.NewConsentRepository(database)
	mlObjectionRepo := repository.NewMLObjectionRepository(database)

	// Services
	eventSvc := service.NewEventService(eventRepo, publisher, logger)
	kvkkSvc := service.NewKVKKService(kvkkRepo, logger)
	dsrSvc := service.NewDSRService(dsrRepo, publisher, cfg.DSRFanoutServices, logger)
	exportSvc := service.NewExportService(exportRepo, eventRepo, logger)
	consentSvc := service.NewConsentService(consentRepo, logger)
	mlObjectionSvc := service.NewMLObjectionService(mlObjectionRepo, publisher, logger)

	// Ingestion worker
	worker := service.NewIngestionWorker(
		eventRepo,
		cfg.IngestBatchSize,
		cfg.IngestFlushInterval,
		cfg.IngestBackpressureMax,
		logger,
	)
	go func() {
		if err := worker.Run(ctx); err != nil && !errors.Is(err, context.Canceled) {
			logger.Error().Err(err).Msg("ingestion worker error")
		}
	}()

	// Event subscriber
	subscriber := event.NewSubscriber(worker, nil, logger)
	go func() {
		if err := subscriber.Start(ctx); err != nil && !errors.Is(err, context.Canceled) {
			logger.Error().Err(err).Msg("event subscriber error")
		}
	}()

	// Auth checker
	authChecker := middleware.NewAuthChecker("http://localhost:8001", 500*time.Millisecond)

	// HTTP router
	r := newRouter(cfg, logger, authChecker, eventSvc, kvkkSvc, dsrSvc, exportSvc, consentSvc, mlObjectionSvc)

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
		logger.Info().Str("addr", srv.Addr).Msg("audit service listening")
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

	cancel()
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), cfg.ShutdownTimeout)
	defer shutdownCancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		logger.Error().Err(err).Msg("graceful shutdown failed")
	}
	logger.Info().Msg("audit service stopped")
}

func newRouter(
	cfg *config.Config,
	logger zerolog.Logger,
	checker *middleware.AuthChecker,
	eventSvc *service.EventService,
	kvkkSvc *service.KVKKService,
	dsrSvc *service.DSRService,
	exportSvc *service.ExportService,
	consentSvc *service.ConsentService,
	mlObjectionSvc *service.MLObjectionService,
) http.Handler {
	r := chi.NewRouter()
	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(chimw.StripSlashes)
	r.Use(chimw.Recoverer)
	r.Use(chimw.Timeout(cfg.RequestTimeout))
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   cfg.CORSAllowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Tenant-ID", "X-User-ID", "X-User-Role"},
		AllowCredentials: true,
		MaxAge:           300,
	}))
	r.Use(middleware.TenantInjector)

	eventH := handler.NewEventHandler(eventSvc)
	kvkkH := handler.NewKVKKHandler(kvkkSvc)
	dsrH := handler.NewDSRHandler(dsrSvc)
	exportH := handler.NewExportHandler(exportSvc)
	consentH := handler.NewConsentHandler(consentSvc)
	mlObjectionH := handler.NewMLObjectionHandler(mlObjectionSvc)

	// Health
	r.Get("/health", healthHandler)
	r.Get("/ready", readyHandler)

	// Authenticated API
	r.Route("/api/v1/audit", func(r chi.Router) {
		r.Use(middleware.RequireAuth(checker))

		// Audit events
		r.Post("/events", eventH.Log)
		r.Get("/events", eventH.Query)
		r.Get("/events/stats", eventH.GetStats)
		r.Get("/events/{id}", eventH.GetByID)
		r.Get("/events/resource/{type}/{id}", eventH.GetResourceHistory)
		r.Get("/events/actor/{userId}", eventH.GetActorActivity)

		// KVKK access log
		r.Post("/kvkk/access-log", kvkkH.LogAccess)
		r.Get("/kvkk/subject/{subjectId}/history", kvkkH.GetSubjectHistory)
		r.Get("/kvkk/processing-register", kvkkH.GetProcessingRegister)

		// KVKK DSR
		r.Post("/kvkk/dsr", dsrH.CreateRequest)
		r.Get("/kvkk/dsr", dsrH.List)
		r.Get("/kvkk/dsr/overdue", dsrH.GetOverdue)
		r.Route("/kvkk/dsr/{id}", func(r chi.Router) {
			r.Get("/", dsrH.GetByID)
			r.Post("/verify", dsrH.Verify)
			r.Post("/process", dsrH.Process)
			r.Post("/complete", dsrH.Complete)
			r.Post("/reject", dsrH.Reject)
			r.Post("/generate-access-package", dsrH.GenerateAccessPackage)
			r.Post("/execute-erasure", dsrH.ExecuteErasure)
		})

		// Exports
		r.Post("/exports", exportH.Create)
		r.Get("/exports", exportH.List)
		r.Get("/exports/{id}", exportH.GetByID)

		// ML objection review queue (KVKK Madde 22 — upc-ml-validation §7)
		r.Post("/ml-objections", mlObjectionH.Create)
		r.Get("/ml-objections", mlObjectionH.List)
		r.Get("/ml-objections/overdue", mlObjectionH.ListOverdue)
		r.Route("/ml-objections/{id}", func(r chi.Router) {
			r.Get("/", mlObjectionH.GetByID)
			r.Post("/verify", mlObjectionH.Verify)
			r.Post("/process", mlObjectionH.Process)
			r.Post("/complete", mlObjectionH.Complete)
			r.Post("/reject", mlObjectionH.Reject)
			// KVKK Madde 22 karar akışları — itirazı haklı bul (tahmini retract)
			// veya DPO onayıyla reddet.
			r.Post("/uphold", mlObjectionH.Uphold)
			r.Post("/dismiss", mlObjectionH.Dismiss)
		})
	})

	// KVKK çalışan rıza yönetimi — separate route group so the gateway can
	// proxy /api/v1/kvkk/consents straight to the audit service.
	r.Route("/api/v1/kvkk/consents", func(r chi.Router) {
		r.Use(middleware.RequireAuth(checker))

		r.Get("/", consentH.List)
		r.Post("/", consentH.Upsert)
		r.Get("/ai-allowed", consentH.GetAIAllowed)
		r.Get("/history/{consentType}", consentH.GetHistory)
	})

	return r
}

func healthHandler(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"status":"ok","service":"audit"}`))
}

func readyHandler(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"status":"ready","service":"audit"}`))
}
