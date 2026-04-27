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

	"github.com/upcore/leave/internal/config"
	"github.com/upcore/leave/internal/db"
	"github.com/upcore/leave/internal/event"
	"github.com/upcore/leave/internal/handler"
	"github.com/upcore/leave/internal/middleware"
	"github.com/upcore/leave/internal/repository"
	"github.com/upcore/leave/internal/service"
)

func main() {
	// Logger setup
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	logger := log.With().Str("service", "leave").Logger()

	cfg, err := config.Load()
	if err != nil {
		logger.Fatal().Err(err).Msg("load config")
	}
	if lvl, err := zerolog.ParseLevel(cfg.LogLevel); err == nil {
		zerolog.SetGlobalLevel(lvl)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// OpenTelemetry tracer — no-op when OTLP endpoint empty.
	shutdownTracer, err := middleware.TracerProvider(ctx, cfg.OTLPEndpoint, "leave", cfg.ServiceVersion)
	if err != nil {
		logger.Error().Err(err).Msg("otel init failed — continuing without tracing")
		shutdownTracer = func(context.Context) error { return nil }
	}
	defer func() {
		shutCtx, shutCancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer shutCancel()
		_ = shutdownTracer(shutCtx)
	}()

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
	typeRepo := repository.NewLeaveTypeRepository(sqlDB)
	requestRepo := repository.NewLeaveRequestRepository(sqlDB)
	balanceRepo := repository.NewLeaveBalanceRepository(sqlDB)

	// Services
	txRunner := &service.SQLTxRunner{DB: sqlDB}
	leaveSvc := service.NewLeaveService(txRunner, requestRepo, balanceRepo, typeRepo, publisher, cfg.MedicalCertMinDays, logger)
	approvalSvc := service.NewApprovalService(txRunner, requestRepo, balanceRepo, typeRepo, publisher, cfg.RequireHRApprovalOver, logger)
	balanceSvc := service.NewBalanceService(txRunner, balanceRepo, typeRepo, publisher, cfg.CarryOverDefaultDays, cfg.ProRateFirstYear, logger)
	calendarSvc := service.NewCalendarService(requestRepo)

	// HTTP
	r := newRouter(cfg, logger, typeRepo, leaveSvc, approvalSvc, balanceSvc, calendarSvc)

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           r,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       cfg.RequestTimeout,
		WriteTimeout:      cfg.RequestTimeout + 5*time.Second,
		IdleTimeout:       90 * time.Second,
	}

	// Graceful shutdown
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
	typeRepo repository.LeaveTypeRepository,
	leaveSvc *service.LeaveService,
	approvalSvc *service.ApprovalService,
	balanceSvc *service.BalanceService,
	calendarSvc *service.CalendarService,
) http.Handler {
	r := chi.NewRouter()
	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(middleware.RequestLogger(logger))
	r.Use(chimw.Recoverer)
	r.Use(chimw.Timeout(cfg.RequestTimeout))
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   cfg.CORSAllowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Tenant-ID", "X-User-ID", "X-User-Role", "X-Employee-ID"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	dep := handler.Dependencies{Log: logger, Validator: handler.NewValidator()}
	typeH := handler.NewTypeHandler(typeRepo, dep)
	reqH := handler.NewRequestHandler(leaveSvc, dep)
	apprH := handler.NewApprovalHandler(approvalSvc, dep)
	balH := handler.NewBalanceHandler(balanceSvc, dep)
	calH := handler.NewCalendarHandler(calendarSvc, dep)

	r.Use(middleware.Tracing("leave"))
	r.Use(middleware.Metrics)

	// Public
	r.Get("/health", healthHandler)
	r.Get("/ready", healthHandler)
	r.Method(http.MethodGet, "/metrics", middleware.MetricsHandler())
	r.Get("/api/v1/leaves/holidays", calH.Holidays)

	// Authenticated
	r.Group(func(r chi.Router) {
		r.Use(middleware.RequireAuth)
		r.Use(middleware.TenantScope)

		r.Get("/api/v1/leaves/types", typeH.List)
		r.Get("/api/v1/leaves/balances/{employee_id}", balH.Get)
		r.Post("/api/v1/leaves/balances/{employee_id}/adjust", balH.Adjust)

		r.Get("/api/v1/leaves/requests", reqH.List)
		r.Post("/api/v1/leaves/requests", reqH.Create)
		r.Get("/api/v1/leaves/requests/{id}", reqH.Get)
		r.Patch("/api/v1/leaves/requests/{id}", reqH.Patch)
		r.Delete("/api/v1/leaves/requests/{id}", reqH.Delete)
		r.Post("/api/v1/leaves/requests/{id}/approve", apprH.Approve)
		r.Post("/api/v1/leaves/requests/{id}/reject", apprH.Reject)

		r.Get("/api/v1/leaves/calendar.ics", calH.ICS)
	})

	return r
}

func healthHandler(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"status":"ok","service":"leave"}`))
}
