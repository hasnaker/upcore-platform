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

	"github.com/upcore/organization/internal/config"
	"github.com/upcore/organization/internal/db"
	"github.com/upcore/organization/internal/event"
	"github.com/upcore/organization/internal/handler"
	"github.com/upcore/organization/internal/middleware"
	"github.com/upcore/organization/internal/repository"
	"github.com/upcore/organization/internal/service"
)

func main() {
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	logger := log.With().Str("service", "organization").Logger()

	cfg, err := config.Load()
	if err != nil {
		logger.Fatal().Err(err).Msg("load config")
	}
	if lvl, err := zerolog.ParseLevel(cfg.LogLevel); err == nil {
		zerolog.SetGlobalLevel(lvl)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

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

	publisher := event.NewNopPublisher(logger)
	defer func() { _ = publisher.Close() }()

	deptRepo := repository.NewDepartmentRepository(sqlDB)
	posRepo := repository.NewPositionRepository(sqlDB)
	teamRepo := repository.NewTeamRepository(sqlDB)
	reportingRepo := repository.NewReportingRepository(sqlDB)
	headcountRepo := repository.NewHeadcountRepository(sqlDB)

	txRunner := &service.SQLTxRunner{DB: sqlDB}
	orgSvc := service.NewOrgService(txRunner, deptRepo, publisher, cfg.MaxDepth, logger)
	posSvc := service.NewPositionService(posRepo, publisher, logger)
	teamSvc := service.NewTeamService(teamRepo, publisher, logger)
	reorgSvc := service.NewReorgService(reportingRepo, publisher, logger)
	hcSvc := service.NewHeadcountService(headcountRepo, deptRepo, publisher, logger)

	r := newRouter(cfg, logger, orgSvc, posSvc, teamSvc, reorgSvc, hcSvc)

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
	orgSvc *service.OrgService,
	posSvc *service.PositionService,
	teamSvc *service.TeamService,
	reorgSvc *service.ReorgService,
	hcSvc *service.HeadcountService,
) http.Handler {
	r := chi.NewRouter()
	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
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

	dep := handler.Dependencies{Log: logger, Validator: handler.NewValidator()}
	deptH := handler.NewDepartmentHandler(orgSvc, dep)
	posH := handler.NewPositionHandler(posSvc, dep)
	teamH := handler.NewTeamHandler(teamSvc, dep)
	repH := handler.NewReportingHandler(reorgSvc, dep)
	hcH := handler.NewHeadcountHandler(hcSvc, dep)

	r.Get("/health", healthHandler)
	r.Get("/ready", healthHandler)

	r.Route("/api/v1", func(r chi.Router) {
		r.Use(middleware.RequireAuth)
		r.Use(middleware.RequireTenant)

		// Departments
		r.Get("/departments", deptH.List)
		r.Get("/departments/tree", deptH.GetTree)
		r.Post("/departments", deptH.Create)
		r.Get("/departments/{id}", deptH.Get)
		r.Patch("/departments/{id}", deptH.Patch)
		r.Delete("/departments/{id}", deptH.Archive)
		r.Get("/departments/{id}/subtree", deptH.GetSubtree)
		r.Get("/departments/{id}/ancestors", deptH.GetAncestors)
		r.Get("/departments/{id}/children", deptH.GetChildren)
		r.Post("/departments/{id}/move", deptH.Move)

		// Positions
		r.Get("/positions", posH.List)
		r.Post("/positions", posH.Create)
		r.Get("/positions/{id}", posH.Get)
		r.Patch("/positions/{id}", posH.Patch)
		r.Patch("/positions/{id}/jdr", posH.UpdateJDR)
		r.Delete("/positions/{id}", posH.Archive)

		// Teams
		r.Get("/teams", teamH.List)
		r.Post("/teams", teamH.Create)
		r.Get("/teams/{id}", teamH.Get)
		r.Patch("/teams/{id}", teamH.Patch)
		r.Delete("/teams/{id}", teamH.Archive)
		r.Get("/teams/{id}/members", teamH.ListMembers)
		r.Post("/teams/{id}/members", teamH.AddMember)
		r.Delete("/teams/{id}/members/{employeeId}", teamH.RemoveMember)

		// Reporting
		r.Post("/reporting/set-manager", repH.SetManager)
		r.Delete("/reporting/lines/{lineId}", repH.EndLine)
		r.Get("/reporting/manager/{employee_id}/reports", repH.GetReports)
		r.Get("/reporting/manager/{employee_id}/team", repH.GetTeam)
		r.Get("/reporting/employee/{employee_id}/chain", repH.GetChain)
		r.Get("/reporting/matrix", repH.GetMatrix)

		// Headcount
		r.Get("/headcount", hcH.GetCurrent)
		r.Get("/headcount/departments", hcH.GetByDepartments)
		r.Get("/headcount/trends", hcH.GetTrends)
		r.Post("/headcount/snapshot", hcH.TakeSnapshot)
	})

	return r
}

func healthHandler(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"status":"ok","service":"organization"}`))
}
