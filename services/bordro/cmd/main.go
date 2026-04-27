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

	"github.com/upcore/bordrosvc/internal/config"
	"github.com/upcore/bordrosvc/internal/db"
	"github.com/upcore/bordrosvc/internal/event"
	"github.com/upcore/bordrosvc/internal/handler"
	"github.com/upcore/bordrosvc/internal/middleware"
	"github.com/upcore/bordrosvc/internal/repository"
	"github.com/upcore/bordrosvc/internal/service"
)

func main() {
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	logger := log.With().Str("service", "bordro").Logger()

	cfg, err := config.Load()
	if err != nil {
		logger.Fatal().Err(err).Msg("load config")
	}
	if lvl, err := zerolog.ParseLevel(cfg.LogLevel); err == nil {
		zerolog.SetGlobalLevel(lvl)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// OpenTelemetry tracer — no-op when OTEL_EXPORTER_OTLP_ENDPOINT is empty.
	shutdownTracer, err := middleware.TracerProvider(ctx, cfg.OTLPEndpoint, "bordro", cfg.ServiceVersion)
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

	periodRepo := repository.NewPeriodRepository(sqlxDB)
	runRepo := repository.NewRunRepository(sqlxDB)
	slipRepo := repository.NewSlipRepository(sqlxDB)
	workplaceRepo := repository.NewWorkplaceRepository(sqlxDB)
	sgkRepo := repository.NewSGKRepository(sqlxDB)
	bankTransferRepo := repository.NewBankTransferRepository(sqlxDB)
	deductionRepo := repository.NewDeductionRepository(sqlxDB)
	muhtasarRepo := repository.NewMuhtasarRepository(sqlxDB)
	empCompRepo := repository.NewEmployeeCompRepository(sqlxDB)
	settingsRepo := repository.NewSettingsRepository(sqlxDB)
	expenseRepo := repository.NewExpenseRepository(sqlxDB)

	// Event publisher — Service Bus when configured, else NopPublisher.
	// Wrapped with RetryPublisher (3 attempts, exp backoff + jitter) for transient faults.
	var publisher event.Publisher = event.NewNopPublisher(logger)
	if cfg.ServiceBusConnection != "" {
		sb, err := event.NewServiceBusPublisher(ctx, cfg.ServiceBusConnection, cfg.ServiceBusTopic, logger)
		if err != nil {
			logger.Error().Err(err).Msg("service bus init failed — falling back to NopPublisher")
		} else {
			// Stack: ServiceBus → CircuitBreaker → Retry
			// Retry handles transient faults; CircuitBreaker handles sustained
			// outages (fail-fast to avoid hammering a dead broker).
			cb := event.NewCircuitBreakerPublisher(sb, logger)
			publisher = event.NewRetryPublisher(cb, logger)
			logger.Info().Str("topic", cfg.ServiceBusTopic).
				Msg("Service Bus publisher active (retry + circuit-breaker wrapped)")
		}
	}
	defer func() { _ = publisher.Close() }()

	// Transactional outbox: writer persists events to app.event_outbox inside
	// a short tx; dispatcher drains to broker async. Broker downtime safe.
	outboxWriter := event.NewOutboxWriter("bordro")
	dispatcher := event.NewOutboxDispatcher(sqlxDB, publisher, logger)
	go dispatcher.Run(ctx)
	outboxAdminRepo := repository.NewOutboxAdminRepository(sqlxDB)

	svc := service.NewPayrollService(periodRepo, runRepo, slipRepo, empCompRepo, settingsRepo, deductionRepo, publisher, outboxWriter, sqlxDB, logger)
	workplaceSvc := service.NewWorkplaceService(workplaceRepo)
	sgkSvc := service.NewSGKService(runRepo, periodRepo, workplaceRepo, sgkRepo)
	bankTransferSvc := service.NewBankTransferService(runRepo, periodRepo, slipRepo, workplaceRepo, bankTransferRepo)
	settingsSvc := service.NewSettingsService(settingsRepo)

	h := handler.NewPayrollHandler(svc)
	sgkH := handler.NewSGKHandler(sgkSvc)
	outboxAdminH := handler.NewOutboxAdminHandler(outboxAdminRepo, dispatcher.MaxRetries)
	workplaceH := handler.NewWorkplaceHandler(workplaceSvc)
	settingsH := handler.NewSettingsHandler(settingsSvc)
	bankTransferH := handler.NewBankTransferHandler(bankTransferSvc)
	slipPDFH := handler.NewSlipPDFHandler(svc, workplaceSvc)
	deductionH := handler.NewDeductionHandler(deductionRepo)
	muhtasarH := handler.NewMuhtasarHandler(muhtasarRepo)
	expenseH := handler.NewExpenseHandler(expenseRepo)

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
	r.Use(middleware.Tracing("bordro"))
	r.Use(middleware.Metrics)
	r.Use(middleware.TenantInjector)

	r.Get("/health", healthHandler)
	r.Get("/ready", readyHandler)
	r.Method(http.MethodGet, "/metrics", middleware.MetricsHandler())

	// Sensitive data — payroll_admin ve hr_director yetkilileri okuyabilir.
	payrollRoles := middleware.RequireRole("payroll_admin", "hr_director", "cxo", "admin")

	r.Route("/api/v1/bordro", func(r chi.Router) {
		r.Use(middleware.RequireTenant)
		r.Use(payrollRoles)

		r.Route("/periods", func(r chi.Router) {
			r.Get("/", h.ListPeriods)
			r.Post("/", h.CreatePeriod)
			r.Route("/{id}", func(r chi.Router) {
				r.Get("/", h.GetPeriod)
				r.Get("/runs", h.ListRuns)
				r.Post("/lock", h.LockPeriod)
				r.Post("/close", h.ClosePeriod)
			})
		})

		r.Route("/runs", func(r chi.Router) {
			r.Post("/", h.CreateRun)
			r.Route("/{id}", func(r chi.Router) {
				r.Get("/", h.GetRun)
				r.Post("/calculate", h.CalculateRun)
				r.Post("/calculate-all-active", h.CalculateAllActive)
				r.Post("/calculate-kamu", h.CalculateKamuRun)
				r.Post("/employees/{eid}/overtime", h.ApplyOvertime)
				r.Post("/approve", h.ApproveRun)
				r.Post("/finalise", h.FinaliseRun)
				r.Post("/void", h.VoidRun)
				r.Get("/slips", h.ListRunSlips)
				// Auto-build SGK APB from this run (slips + workplace JOIN)
				r.Post("/sgk/apb", sgkH.APBFromRun)
				// Banka toplu transfer dosyası — ?format=ing|garanti|isbank|...
				r.Get("/bank-transfer", bankTransferH.Download)
			})
		})

		// Per-employee auto builders
		r.Post("/employees/{id}/sgk/igb", sgkH.IGBForEmployee)

		// Ek kesintiler: avans, icra, nafaka, sendika aidatı vs.
		r.Route("/employees/{id}/deductions", func(r chi.Router) {
			r.Get("/", deductionH.List)
			r.Post("/", deductionH.Create)
		})
		r.Delete("/deductions/{id}", deductionH.Deactivate)

		// Muhtasar beyanname (aylık özet + XML)
		r.Route("/muhtasar", func(r chi.Router) {
			r.Get("/", muhtasarH.Summary)
			r.Get("/xml", muhtasarH.ExportXML)
		})

		// Workplace configuration (singleton per tenant)
		r.Route("/workplace", func(r chi.Router) {
			r.Get("/", workplaceH.Get)
			r.Put("/", workplaceH.Upsert)
		})

		// Tenant bordro ayarları (yemek, yol, hoursPerMonth, kıdem tavanı vs.)
		r.Route("/settings", func(r chi.Router) {
			r.Get("/", settingsH.Get)
			r.Put("/", settingsH.Upsert)
		})

		// Expense management (masraf yönetimi) — draft/submit/approve/reimburse.
		r.Route("/expense-reports", func(r chi.Router) {
			expenseH.Register(r)
		})

		// Transactional outbox DLQ admin
		r.Route("/outbox", func(r chi.Router) {
			r.Get("/stats", outboxAdminH.Stats)
			r.Get("/dlq", outboxAdminH.ListDLQ)
			r.Post("/{id}/replay", outboxAdminH.Replay)
		})

		r.Get("/slips/{id}", h.GetSlip)
		r.Get("/slips/{id}/pdf", slipPDFH.Download)
		r.Get("/employees/{id}/slips", h.EmployeeSlips)

		// SGK e-Bildirge XML builders — role-gated ile aynı kapsam.
		r.Route("/sgk", func(r chi.Router) {
			r.Post("/apb", sgkH.APB)
			r.Post("/igb", sgkH.IGB)
			r.Post("/iab", sgkH.IAB)
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
	_, _ = w.Write([]byte(`{"status":"ok","service":"bordro"}`))
}

func readyHandler(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"status":"ready","service":"bordro"}`))
}
