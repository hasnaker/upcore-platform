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

	"github.com/upcore/mobility/internal/config"
	"github.com/upcore/mobility/internal/db"
	"github.com/upcore/mobility/internal/handler"
	"github.com/upcore/mobility/internal/middleware"
	"github.com/upcore/mobility/internal/repository"
	"github.com/upcore/mobility/internal/service"
)

func main() {
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	logger := log.With().Str("service", "mobility").Logger()

	cfg, err := config.Load()
	if err != nil {
		logger.Fatal().Err(err).Msg("load config")
	}
	if lvl, err := zerolog.ParseLevel(cfg.LogLevel); err == nil {
		zerolog.SetGlobalLevel(lvl)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

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

	// Repositories
	rotationRepo := repository.NewRotationRepo(sqlxDB)
	careerPathRepo := repository.NewCareerPathRepo(sqlxDB)
	successionRepo := repository.NewSuccessionRepo(sqlxDB)

	// Services
	rotationSvc := service.NewRotationService(rotationRepo, cfg.RotationCooldownDays, logger)
	careerPathSvc := service.NewCareerPathService(careerPathRepo, logger)
	successionSvc := service.NewSuccessionService(successionRepo, cfg.SuccessionPoolMaxSize, logger)

	// Handlers
	rotationH := handler.NewRotationHandler(rotationSvc, logger)
	careerPathH := handler.NewCareerPathHandler(careerPathSvc, logger)
	successionH := handler.NewSuccessionHandler(successionSvc, logger)
	marketplaceRepo := repository.NewMarketplaceRepository(sqlxDB)
	marketplaceH := handler.NewMarketplaceHandler(marketplaceRepo, logger)

	r := newRouter(cfg, logger, rotationH, careerPathH, successionH, marketplaceH)

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
	rotationH *handler.RotationHandler,
	careerPathH *handler.CareerPathHandler,
	successionH *handler.SuccessionHandler,
	marketplaceH *handler.MarketplaceHandler,
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
		AllowedMethods:   []string{"GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Tenant-ID", "X-User-ID", "X-User-Role"},
		AllowCredentials: true,
		MaxAge:           300,
	}))
	r.Use(middleware.TenantInjector)

	r.Get("/health", healthHandler)
	r.Get("/ready", readyHandler)

	r.Route("/api/v1/mobility", func(r chi.Router) {
		r.Use(middleware.RequireTenant)

		// Internal rotations
		r.Route("/rotations", func(r chi.Router) {
			r.Post("/", rotationH.Propose)
			r.Get("/", rotationH.List)
			r.Get("/pending", rotationH.ListPending)
			r.Post("/{id}/approve", rotationH.Approve)
			r.Post("/{id}/reject", rotationH.Reject)
			r.Post("/{id}/complete", rotationH.Complete)
		})

		// Employee-centric history
		r.Get("/employees/{employeeId}/rotations", rotationH.ListByEmployee)

		// Career paths
		r.Route("/career-paths", func(r chi.Router) {
			r.Post("/", careerPathH.Create)
			r.Get("/", careerPathH.List)
			r.Get("/{id}", careerPathH.Get)
			r.Post("/{id}/steps", careerPathH.AddStep)
		})

		// Succession planning
		r.Route("/succession-plans", func(r chi.Router) {
			r.Post("/", successionH.UpsertPlan)
			r.Get("/", successionH.ListPlans)
			r.Get("/critical", successionH.ListCriticalPositions)
			r.Get("/{planId}", successionH.GetPlan)
			r.Get("/{planId}/candidates", successionH.Candidates)
			r.Post("/{planId}/candidates", successionH.AddCandidate)
			r.Patch("/{planId}/candidates/{candidateId}", successionH.UpdateReadiness)
			r.Delete("/{planId}/candidates/{candidateId}", successionH.RemoveCandidate)
		})

		// Internal marketplace (dahili kariyer fırsatları)
		marketplaceH.Register(r)
	})

	return r
}

func healthHandler(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"status":"ok","service":"mobility"}`))
}

func readyHandler(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"status":"ready","service":"mobility"}`))
}
