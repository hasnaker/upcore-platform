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

	"github.com/upcore/performance/internal/config"
	"github.com/upcore/performance/internal/db"
	"github.com/upcore/performance/internal/event"
	"github.com/upcore/performance/internal/handler"
	"github.com/upcore/performance/internal/middleware"
	"github.com/upcore/performance/internal/repository"
	"github.com/upcore/performance/internal/service"
)

func main() {
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	logger := log.With().Str("service", "performance").Logger()

	cfg, err := config.Load()
	if err != nil {
		logger.Fatal().Err(err).Msg("load config")
	}
	if lvl, err := zerolog.ParseLevel(cfg.LogLevel); err == nil {
		zerolog.SetGlobalLevel(lvl)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// OpenTelemetry tracer — no-op when endpoint empty.
	shutdownTracer, err := middleware.TracerProvider(ctx, cfg.OTLPEndpoint, "performance", cfg.ServiceVersion)
	if err != nil {
		logger.Error().Err(err).Msg("otel init failed — continuing without tracing")
		shutdownTracer = func(context.Context) error { return nil }
	}
	defer func() {
		shutCtx, shutCancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer shutCancel()
		_ = shutdownTracer(shutCtx)
	}()

	sqlxDB, err := db.Open(ctx, db.Config{
		DSN:         cfg.DatabaseURL,
		MaxOpenConn: cfg.DatabaseMaxOpen,
		MaxIdleConn: cfg.DatabaseMaxIdle,
	})
	if err != nil {
		logger.Fatal().Err(err).Msg("open database")
	}
	defer func() { _ = db.Close(sqlxDB) }()
	logger.Info().Msg("database connected")

	cycleRepo := repository.NewCycleRepository(sqlxDB)
	goalRepo := repository.NewGoalRepository(sqlxDB)
	okrRepo := repository.NewOKRRepository(sqlxDB)
	reviewRepo := repository.NewReviewRepository(sqlxDB)
	nineBoxRepo := repository.NewNineBoxRepository(sqlxDB)
	competencyRepo := repository.NewCompetencyRepository(sqlxDB)
	survey360Repo := repository.NewSurvey360Repository(sqlxDB)

	// Event publisher — Service Bus or Nop fallback.
	var publisher event.Publisher = event.NewNopPublisher(logger)
	if cfg.ServiceBusConnection != "" {
		sb, err := event.NewServiceBusPublisher(ctx, cfg.ServiceBusConnection, cfg.ServiceBusTopic, logger)
		if err != nil {
			logger.Error().Err(err).Msg("service bus init failed — NopPublisher kullanılıyor")
		} else {
			cb := event.NewCircuitBreakerPublisher(sb, logger)
			publisher = event.NewRetryPublisher(cb, logger)
			logger.Info().Str("topic", cfg.ServiceBusTopic).Msg("Service Bus publisher active (retry + circuit-breaker wrapped)")
		}
	}
	defer func() { _ = publisher.Close() }()

	// Transactional outbox dispatcher — background goroutine.
	outboxDispatcher := event.NewOutboxDispatcher(sqlxDB, publisher, logger)
	go outboxDispatcher.Run(ctx)
	outboxAdminRepo := repository.NewOutboxAdminRepository(sqlxDB)
	outboxAdminH := handler.NewOutboxAdminHandler(outboxAdminRepo, outboxDispatcher.MaxRetries)

	// Wrap publisher so service-layer emit calls persist events to
	// app.event_outbox first. Dispatcher pushes async.
	outboxWriter := event.NewOutboxWriter("performance")
	publisher = event.NewOutboxPublisher(
		publisher, sqlxDB, outboxWriter,
		middleware.TenantID, logger,
	)

	cycleSvc := service.NewCycleService(cycleRepo, logger)
	goalSvc := service.NewGoalService(goalRepo, logger)
	okrSvc := service.NewOKRService(okrRepo, logger).WithPublisher(publisher)
	reviewSvc := service.NewReviewService(reviewRepo, logger)
	nineBoxSvc := service.NewNineBoxService(nineBoxRepo, logger)
	competencySvc := service.NewCompetencyService(competencyRepo)
	survey360Svc := service.NewSurvey360Service(survey360Repo, logger).WithPublisher(publisher)

	cycleH := handler.NewCycleHandler(cycleSvc)
	goalH := handler.NewGoalHandler(goalSvc)
	okrH := handler.NewOKRHandler(okrSvc)
	reviewH := handler.NewReviewHandler(reviewSvc)
	nineBoxH := handler.NewNineBoxHandler(nineBoxSvc)
	competencyH := handler.NewCompetencyHandler(competencySvc)
	survey360H := handler.NewSurvey360Handler(survey360Svc)

	// Extension repos (calibration + dev plan + peer nomination).
	calibRepo := repository.NewCalibrationRepository(sqlxDB)
	devRepo := repository.NewDevelopmentRepository(sqlxDB)
	peerRepo := repository.NewPeerNominationRepository(sqlxDB)
	extH := handler.NewExtensionsHandler(calibRepo, devRepo, peerRepo)

	// PIP (Performans İyileştirme Planı) — İş Kanunu 25/2 iş akışı.
	pipRepo := repository.NewPipRepository(sqlxDB)
	pipSvc := service.NewPipService(pipRepo, logger).WithPublisher(publisher)
	pipH := handler.NewPipHandler(pipSvc)

	r := chi.NewRouter()
	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(chimw.StripSlashes)
	r.Use(middleware.RequestLogger(logger))
	r.Use(chimw.Recoverer)
	r.Use(chimw.Timeout(cfg.RequestTimeout))
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   cfg.CORSAllowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Tenant-ID", "X-User-ID", "X-User-Role"},
		AllowCredentials: true,
		MaxAge:           300,
	}))
	r.Use(middleware.Tracing("performance"))
	r.Use(middleware.Metrics)
	r.Use(middleware.TenantInjector)

	r.Get("/health", healthHandler)
	r.Get("/ready", readyHandler)
	r.Method(http.MethodGet, "/metrics", middleware.MetricsHandler())

	r.Route("/api/v1/performance", func(r chi.Router) {
		r.Use(middleware.RequireTenant)

		r.Route("/cycles", func(r chi.Router) {
			r.Get("/", cycleH.List)
			r.Post("/", cycleH.Create)
			r.Route("/{id}", func(r chi.Router) {
				r.Get("/", cycleH.Get)
				r.Post("/advance", cycleH.Advance)
			})
		})

		r.Route("/goals", func(r chi.Router) {
			r.Get("/", goalH.List)
			r.Post("/", goalH.Create)
			r.Route("/{id}", func(r chi.Router) {
				r.Get("/", goalH.Get)
				r.Patch("/", goalH.Patch)
			})
		})

		r.Route("/okrs", func(r chi.Router) {
			r.Get("/", okrH.List)
			r.Get("/tree", okrH.Tree)
			r.Post("/", okrH.Create)
			r.Route("/{id}", func(r chi.Router) {
				r.Get("/", okrH.Get)
				r.Patch("/", okrH.Patch)
				r.Patch("/key-results/{krId}", okrH.PatchKR)
			})
		})

		r.Route("/reviews", func(r chi.Router) {
			r.Get("/", reviewH.List)
			r.Post("/", reviewH.Create)
			r.Route("/{id}", func(r chi.Router) {
				r.Get("/", reviewH.Get)
				r.Patch("/", reviewH.Patch)
				r.Post("/transition", reviewH.Transition)
				r.Post("/feedback", reviewH.AddFeedback)
			})
		})

		r.Route("/nine-box", func(r chi.Router) {
			r.Get("/grid", nineBoxH.Grid)
			r.Post("/", nineBoxH.Upsert)
			r.Get("/cycles/{cycleId}/employees/{employeeId}", nineBoxH.Get)
		})

		// Extensions: calibration session + development plan + peer nomination
		extH.Register(r)

		// PIP (Performans İyileştirme Planı) routes.
		pipH.Register(r)

		r.Route("/competencies", func(r chi.Router) {
			r.Get("/", competencyH.List)
			r.Put("/", competencyH.Upsert)
		})

		// 360° feedback campaigns + invitations + responses + report.
		r.Route("/surveys/360", func(r chi.Router) {
			survey360H.Register(r)
		})

		// Transactional outbox DLQ admin.
		r.Route("/outbox", func(r chi.Router) {
			r.Get("/stats", outboxAdminH.Stats)
			r.Get("/dlq", outboxAdminH.ListDLQ)
			r.Post("/{id}/replay", outboxAdminH.Replay)
		})
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

func healthHandler(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"status":"ok","service":"performance"}`))
}

func readyHandler(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"status":"ready","service":"performance"}`))
}
