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
	"github.com/google/uuid"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"github.com/upcore/ats/internal/config"
	"github.com/upcore/ats/internal/db"
	"github.com/upcore/ats/internal/event"
	"github.com/upcore/ats/internal/handler"
	"github.com/upcore/ats/internal/ingestion"
	"github.com/upcore/ats/internal/middleware"
	"github.com/upcore/ats/internal/repository"
	"github.com/upcore/ats/internal/service"
)

func main() {
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	logger := log.With().Str("service", "ats").Logger()

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
	reqRepo := repository.NewRequisitionRepository(sqlDB)
	candRepo := repository.NewCandidateRepository(sqlDB)
	appRepo := repository.NewApplicationRepository(sqlDB)
	evtRepo := repository.NewEventRepository(sqlDB)
	interviewRepo := repository.NewInterviewRepository(sqlDB)
	offerRepo := repository.NewOfferRepository(sqlDB)
	stageRepo := repository.NewStageRepository(sqlDB)

	// Services
	reqSvc := service.NewRequisitionService(reqRepo, publisher, logger)
	candSvc := service.NewCandidateService(candRepo, publisher, logger)
	appSvc := service.NewApplicationService(appRepo, reqRepo, candRepo, evtRepo, publisher, logger)
	pipelineSvc := service.NewPipelineService(appRepo, evtRepo, stageRepo, publisher, logger)
	interviewSvc := service.NewInterviewService(interviewRepo, appRepo, evtRepo, publisher, logger)
	offerSvc := service.NewOfferService(offerRepo, appRepo, evtRepo, publisher, logger)
	ingestionSvc := service.NewIngestionService(candRepo, publisher, logger)
	_ = ingestionSvc

	// Auth checker
	authChecker := middleware.NewAuthChecker(cfg.AuthServiceURL, cfg.AuthServiceTimeout)

	// HTTP
	r := newRouter(cfg, logger, authChecker, reqSvc, candSvc, appSvc, pipelineSvc, interviewSvc, offerSvc)

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           r,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       cfg.RequestTimeout,
		WriteTimeout:      cfg.RequestTimeout + 5*time.Second,
		IdleTimeout:       90 * time.Second,
	}

	// Start Kariyer.net poller (if configured).
	if cfg.KariyerFeedURL != "" && cfg.KariyerTenantID != "" {
		tenantID, err := uuid.Parse(cfg.KariyerTenantID)
		if err == nil {
			poller := ingestion.NewKariyerPoller(
				cfg.KariyerFeedURL,
				cfg.KariyerFeedAuth,
				tenantID,
				candRepo,
				publisher,
				logger,
			)
			go poller.Run(ctx, cfg.KariyerPollFreq)
		}
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
	reqSvc *service.RequisitionService,
	candSvc *service.CandidateService,
	appSvc *service.ApplicationService,
	pipelineSvc *service.PipelineService,
	interviewSvc *service.InterviewService,
	offerSvc *service.OfferService,
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

	reqH := handler.NewRequisitionHandler(reqSvc, dep)
	candH := handler.NewCandidateHandler(candSvc, dep)
	appH := handler.NewApplicationHandler(appSvc, pipelineSvc, dep)
	pipelineH := handler.NewPipelineHandler(pipelineSvc, dep)
	interviewH := handler.NewInterviewHandler(interviewSvc, dep)
	offerH := handler.NewOfferHandler(offerSvc, dep)

	// Health
	r.Get("/health", healthHandler)
	r.Get("/ready", readyHandler)

	// Authenticated endpoints
	r.Route("/api/v1/ats", func(r chi.Router) {
		r.Use(middleware.RequireAuth(checker))

		// Requisitions
		r.Route("/requisitions", func(r chi.Router) {
			r.Get("/", reqH.List)
			r.Post("/", reqH.Create)
			r.Route("/{id}", func(r chi.Router) {
				r.Get("/", reqH.Get)
				r.Patch("/", reqH.Patch)
				r.Post("/open", reqH.Open)
				r.Post("/hold", reqH.Hold)
				r.Post("/close", reqH.Close)
				r.Get("/board", pipelineH.GetBoard)
			})
		})

		// Candidates
		r.Route("/candidates", func(r chi.Router) {
			r.Get("/", candH.List)
			r.Post("/", candH.Create)
			r.Route("/{id}", func(r chi.Router) {
				r.Get("/", candH.Get)
				r.Patch("/", candH.Patch)
				r.Delete("/", candH.Delete)
				r.Post("/cv", candH.UploadCV)
				r.Get("/cv/download", candH.DownloadCV)
				r.Post("/tags", candH.AddTags)
			})
		})

		// Applications
		r.Route("/applications", func(r chi.Router) {
			r.Get("/", appH.List)
			r.Post("/", appH.Submit)
			r.Post("/bulk-move", appH.BulkMove)
			r.Route("/{id}", func(r chi.Router) {
				r.Get("/", appH.Get)
				r.Post("/move", appH.Move)
				r.Post("/reject", appH.Reject)
				r.Post("/score", appH.Score)
				r.Post("/notes", appH.AddNote)
				r.Get("/events", appH.ListEvents)
			})
		})

		// Pipeline stages
		r.Route("/pipeline/stages", func(r chi.Router) {
			r.Get("/", pipelineH.ListStages)
			r.Post("/", pipelineH.CreateStage)
			r.Post("/reorder", pipelineH.ReorderStages)
			r.Patch("/{id}", pipelineH.UpdateStage)
		})

		// Interviews
		r.Route("/interviews", func(r chi.Router) {
			r.Post("/", interviewH.Schedule)
			r.Get("/mine", interviewH.ListMine)
			r.Route("/{id}", func(r chi.Router) {
				r.Get("/", interviewH.Get)
				r.Patch("/", interviewH.Patch)
				r.Post("/cancel", interviewH.Cancel)
				r.Post("/complete", interviewH.Complete)
				r.Post("/feedback", interviewH.SubmitFeedback)
			})
		})

		// Offers
		r.Route("/offers", func(r chi.Router) {
			r.Post("/", offerH.Create)
			r.Route("/{id}", func(r chi.Router) {
				r.Get("/", offerH.Get)
				r.Patch("/", offerH.Patch)
				r.Post("/send", offerH.Send)
				r.Post("/accept", offerH.Accept)
				r.Post("/decline", offerH.Decline)
				r.Post("/withdraw", offerH.Withdraw)
			})
		})

		// Analytics
		r.Get("/analytics/funnel", pipelineH.GetFunnelAnalytics)
		r.Get("/analytics/time-to-hire", pipelineH.GetTimeToHire)
	})

	return r
}

func healthHandler(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"status":"ok","service":"ats"}`))
}

func readyHandler(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"status":"ready","service":"ats"}`))
}
