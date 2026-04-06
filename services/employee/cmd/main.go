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

	"github.com/upcore/employee/internal/config"
	"github.com/upcore/employee/internal/db"
	"github.com/upcore/employee/internal/event"
	"github.com/upcore/employee/internal/handler"
	"github.com/upcore/employee/internal/middleware"
	"github.com/upcore/employee/internal/repository"
	"github.com/upcore/employee/internal/service"
)

func main() {
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	logger := log.With().Str("service", "employee").Logger()

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
	empRepo := repository.NewEmployeeRepository(sqlDB)
	histRepo := repository.NewHistoryRepository(sqlDB)
	contactRepo := repository.NewContactRepository(sqlDB)

	// Services
	empSvc := service.NewEmployeeService(empRepo, histRepo, publisher, logger)
	searchSvc := service.NewSearchService(empRepo)
	importSvc := service.NewImportService(empRepo, histRepo, publisher, cfg.ImportMaxRows, cfg.ImportBatchSize, logger)
	historySvc := service.NewHistoryService(empRepo, histRepo, publisher)
	contactSvc := service.NewContactService(empRepo, contactRepo)

	// Auth checker
	authChecker := middleware.NewAuthChecker(cfg.AuthServiceURL, cfg.AuthServiceTimeout)

	// HTTP
	r := newRouter(cfg, logger, authChecker, empSvc, searchSvc, importSvc, historySvc, contactSvc)

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
	empSvc *service.EmployeeService,
	searchSvc *service.SearchService,
	importSvc *service.ImportService,
	historySvc *service.HistoryService,
	contactSvc *service.ContactService,
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

	dep := handler.Dependencies{Log: logger, Validator: handler.NewValidator()}

	empH := handler.NewEmployeeHandler(empSvc, dep)
	searchH := handler.NewSearchHandler(searchSvc)
	importH := handler.NewImportHandler(importSvc, cfg.ImportMaxFileMB)
	historyH := handler.NewHistoryHandler(historySvc)
	contactH := handler.NewContactHandler(contactSvc)

	// Health
	r.Get("/health", healthHandler)
	r.Get("/ready", readyHandler)

	// Authenticated endpoints
	r.Route("/api/v1", func(r chi.Router) {
		r.Use(middleware.RequireAuth(checker))
		r.Route("/employees", func(r chi.Router) {
			r.Get("/", empH.List)
			r.Post("/", empH.Create)
			r.Get("/search", searchH.Search)
			r.Get("/me", empH.GetMe)
			r.Post("/import", importH.Import)
			r.Route("/{id}", func(r chi.Router) {
				r.Get("/", empH.Get)
				r.Patch("/", empH.Patch)
				r.Delete("/", empH.Delete)
				r.Post("/terminate", empH.Terminate)
				r.Post("/reinstate", empH.Reinstate)
				r.Get("/history", historyH.List)
				r.Post("/history", historyH.Append)
				r.Get("/contacts", contactH.List)
				r.Post("/contacts", contactH.Create)
				r.Patch("/contacts/{cid}", contactH.Patch)
				r.Delete("/contacts/{cid}", contactH.Delete)
			})
		})
	})

	return r
}

func healthHandler(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"status":"ok","service":"employee"}`))
}

func readyHandler(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"status":"ready","service":"employee"}`))
}
