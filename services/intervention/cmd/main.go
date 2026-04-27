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

	"github.com/upcore/intervention/internal/config"
	"github.com/upcore/intervention/internal/db"
	"github.com/upcore/intervention/internal/event"
	"github.com/upcore/intervention/internal/handler"
	"github.com/upcore/intervention/internal/middleware"
	"github.com/upcore/intervention/internal/repository"
	"github.com/upcore/intervention/internal/service"
)

func main() {
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	logger := log.With().Str("service", "intervention").Logger()

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

	// Auth checker
	authChecker := middleware.NewAuthChecker("http://localhost:8001", 500*time.Millisecond)

	// Repositories
	catalogRepo := repository.NewCatalogRepository(sqlDB)
	assignmentRepo := repository.NewAssignmentRepository(sqlDB)
	outcomeRepo := repository.NewOutcomeRepository(sqlDB)
	effectivenessRepo := repository.NewEffectivenessRepository(sqlDB)
	consentRepo := repository.NewConsentRepository(sqlDB)

	// Services
	catalogSvc := service.NewCatalogService(catalogRepo, publisher, logger)
	assignmentSvc := service.NewAssignmentService(assignmentRepo, catalogRepo, publisher, logger)
	outcomeSvc := service.NewOutcomeService(outcomeRepo, assignmentRepo, publisher, logger)
	effectivenessSvc := service.NewEffectivenessService(
		effectivenessRepo, outcomeRepo, catalogRepo, publisher,
		cfg.PriorAlpha, cfg.PriorBeta, cfg.SuccessThreshold, logger,
	)
	recommenderSvc := service.NewRecommenderService(catalogRepo, effectivenessRepo, cfg.DefaultTopK, logger)
	consentSvc := service.NewConsentService(consentRepo, assignmentRepo, catalogRepo, publisher, logger)

	// Feedback worker — outcome threshold crossed → auto-close + reward event.
	feedbackWorker := service.NewFeedbackWorker(sqlDB, publisher, logger)
	go feedbackWorker.Run(ctx)

	// ml.prediction.retracted.v1 subscriber — KVKK Madde 22 reversal workflow:
	// cancels every intervention assignment derived from the retracted
	// prediction. The sink is wired to AssignmentService so the cancellation
	// path reuses the same invariants as manual Cancel (status guard, event
	// emission, notes append).
	subscriber := event.NewSubscriber(logger).WithRetractionHandler(assignmentSvc)
	_ = subscriber // reserved for future broker wire (Azure Service Bus).

	// HTTP router
	r := newRouter(cfg, logger, authChecker,
		catalogSvc, assignmentSvc, outcomeSvc, effectivenessSvc, recommenderSvc, consentSvc)

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

	cancel()
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
	catalogSvc *service.CatalogService,
	assignmentSvc *service.AssignmentService,
	outcomeSvc *service.OutcomeService,
	effectivenessSvc *service.EffectivenessService,
	recommenderSvc *service.RecommenderService,
	consentSvc *service.ConsentService,
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

	catalogH := handler.NewCatalogHandler(catalogSvc, logger)
	assignmentH := handler.NewAssignmentHandler(assignmentSvc, logger)
	outcomeH := handler.NewOutcomeHandler(outcomeSvc, logger)
	effectivenessH := handler.NewEffectivenessHandler(effectivenessSvc, logger)
	consentH := handler.NewConsentHandler(consentSvc, logger, 72*time.Hour)
	recommenderH := handler.NewRecommenderHandler(recommenderSvc, logger)

	// Health
	r.Get("/health", healthHandler)
	r.Get("/ready", readyHandler)

	// Authenticated endpoints
	r.Route("/api/v1/interventions", func(r chi.Router) {
		r.Use(middleware.RequireAuth(checker))

		// Catalog
		r.Route("/catalog", func(r chi.Router) {
			r.Get("/", catalogH.List)
			r.Post("/", catalogH.Create)
			r.Get("/{id}", catalogH.Get)
			r.Patch("/{id}", catalogH.Update)
			r.Post("/{id}/activate", catalogH.Activate)
			r.Post("/{id}/deactivate", catalogH.Deactivate)
		})

		// Assignments
		r.Route("/assignments", func(r chi.Router) {
			r.Get("/", assignmentH.List)
			r.Post("/", assignmentH.Create)
			r.Post("/bulk", assignmentH.BulkCreate)
			r.Get("/mine", assignmentH.ListMine)
			r.Get("/pending-consent-mine", assignmentH.ListPendingConsentMine)
			r.Route("/{id}", func(r chi.Router) {
				r.Get("/", assignmentH.Get)
				r.Patch("/", assignmentH.Update)
				r.Post("/start", assignmentH.Start)
				r.Post("/complete", assignmentH.Complete)
				r.Post("/cancel", assignmentH.Cancel)
				r.Post("/consent", consentH.HandleConsent)
				r.Get("/consent/history", consentH.ListByAssignment)
				r.Post("/remind", consentH.Remind)
				r.Post("/outcomes", outcomeH.Create)
				r.Get("/outcomes", outcomeH.Get)
			})
		})

		// Effectiveness
		r.Route("/effectiveness", func(r chi.Router) {
			r.Get("/", effectivenessH.List)
			r.Get("/summary", effectivenessH.Summary)
			r.Get("/trends", effectivenessH.Trends)
			r.Get("/export.csv", effectivenessH.ExportCSV)
			r.Get("/{interventionId}", effectivenessH.GetByIntervention)
			r.Get("/{interventionId}/detail", effectivenessH.Detail)
			r.Post("/recompute", effectivenessH.Recompute)
		})

		// Recommender
		r.Post("/recommend", recommenderH.Recommend)

		// Consent history
		r.Get("/consent/history/{employeeId}", consentH.GetHistory)

		// Analytics dashboard
		r.Get("/analytics/dashboard", func(w http.ResponseWriter, r *http.Request) {
			handler.WriteJSON(w, http.StatusOK, map[string]any{
				"active_assignments": 0,
				"completion_rate":    0,
				"avg_effect_size":    0,
				"top_interventions":  []any{},
				"by_dimension":       []any{},
			})
		})
	})

	return r
}

func healthHandler(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"status":"ok","service":"intervention"}`))
}

func readyHandler(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"status":"ready","service":"intervention"}`))
}
