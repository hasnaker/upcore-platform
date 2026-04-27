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

	"github.com/upcore/employee/internal/config"
	"github.com/upcore/employee/internal/db"
	"github.com/upcore/employee/internal/event"
	"github.com/upcore/employee/internal/handler"
	"github.com/upcore/employee/internal/middleware"
	"github.com/upcore/employee/internal/repository"
	empsaga "github.com/upcore/employee/internal/saga"
	"github.com/upcore/employee/internal/service"
	"github.com/upcore/employee/internal/storage"
	"github.com/upcore/saga"
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

	// OpenTelemetry tracer — no-op when OTEL_EXPORTER_OTLP_ENDPOINT is empty.
	shutdownTracer, err := middleware.TracerProvider(ctx, cfg.OTLPEndpoint, "employee", cfg.ServiceVersion)
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

	// Event publisher — Azure Service Bus when connection string is set,
	// else log-only NopPublisher for dev/test.
	var publisher event.Publisher = event.NewNopPublisher(logger)
	if cfg.ServiceBusConnection != "" {
		sb, err := event.NewServiceBusPublisher(ctx, cfg.ServiceBusConnection, cfg.ServiceBusTopic, logger)
		if err != nil {
			logger.Error().Err(err).Msg("service bus init failed — falling back to NopPublisher")
		} else {
			cb := event.NewCircuitBreakerPublisher(sb, logger)
			publisher = event.NewRetryPublisher(cb, logger)
			logger.Info().
				Str("topic", cfg.ServiceBusTopic).
				Msg("Service Bus publisher active (retry + circuit-breaker wrapped)")
		}
	} else {
		logger.Info().Msg("SERVICE_BUS_CONNECTION_STRING boş — NopPublisher kullanılıyor")
	}
	defer func() { _ = publisher.Close() }()

	// Transactional outbox dispatcher — background goroutine drains pending
	// app.event_outbox rows to the publisher (at-least-once delivery).
	outboxDispatcher := event.NewOutboxDispatcher(sqlDB, publisher, logger)
	go outboxDispatcher.Run(ctx)
	outboxAdminRepo := repository.NewOutboxAdminRepository(sqlDB)

	// Wrap the publisher so that service-layer emit calls persist events to
	// app.event_outbox first. The dispatcher pushes them to the broker
	// asynchronously — broker downtime no longer drops events.
	outboxWriter := event.NewOutboxWriter("employee")
	publisher = event.NewOutboxPublisher(
		publisher, sqlDB, outboxWriter,
		middleware.TenantIDFromContext, logger,
	)

	// Repositories
	empRepo := repository.NewEmployeeRepository(sqlDB)
	histRepo := repository.NewHistoryRepository(sqlDB)
	contactRepo := repository.NewContactRepository(sqlDB)
	offerRepo := repository.NewOfferRepository(sqlDB)
	onboardingRepo := repository.NewOnboardingRepository(sqlDB)
	careerRepo := repository.NewCareerRepository(sqlDB)
	compRepo := repository.NewCompensationRepository(sqlDB)
	relatedRepo := repository.NewRelatedContactRepository(sqlDB)
	positionRepo := repository.NewPositionRepository(sqlDB)
	offboardingRepo := repository.NewOffboardingRepository(sqlDB)

	// Services
	empSvc := service.NewEmployeeService(empRepo, histRepo, publisher, logger)
	searchSvc := service.NewSearchService(empRepo)
	importSvc := service.NewImportService(empRepo, histRepo, publisher, cfg.ImportMaxRows, cfg.ImportBatchSize, logger)
	historySvc := service.NewHistoryService(empRepo, histRepo, publisher)
	contactSvc := service.NewContactService(empRepo, contactRepo)
	offerSvc := service.NewOfferService(offerRepo, empRepo, publisher, logger)
	onboardingSvc := service.NewOnboardingService(onboardingRepo, empRepo, publisher, logger)
	careerSvc := service.NewCareerService(careerRepo, empRepo, publisher, logger)
	compGuard := service.NewRoleGuard("hr_director", "hr_admin", "cxo", "admin")
	compSvc := service.NewCompensationService(compRepo, careerSvc, empRepo, compGuard, publisher, logger)
	relatedSvc := service.NewRelatedContactService(relatedRepo, empRepo)
	positionSvc := service.NewPositionService(positionRepo, empRepo)
	offboardingSvc := service.NewOffboardingService(offboardingRepo, empRepo, careerSvc, publisher, logger)

	// Auth checker
	authChecker := middleware.NewAuthChecker(cfg.AuthServiceURL, cfg.AuthServiceTimeout)

	outboxAdminH := handler.NewOutboxAdminHandler(outboxAdminRepo, outboxDispatcher.MaxRetries)
	offerPDFH := handler.NewOfferPDFHandler(offerSvc)
	esignH := handler.NewESignWebhookHandler(offerSvc, logger)

	// Avatar/bulk — Azure Blob in prod, LocalFS in dev (no env set).
	var uploader handler.Uploader
	if acct := os.Getenv("AZURE_BLOB_ACCOUNT"); acct != "" {
		uploader = storage.NewAzureBlob(acct, getenvDefault("AZURE_BLOB_CONTAINER", "uploads"))
	} else {
		lfs, lerr := storage.NewLocalFS("", "")
		if lerr != nil {
			logger.Warn().Err(lerr).Msg("localfs uploader init failed; avatar upload disabled")
		} else {
			uploader = lfs
		}
	}
	avatarH := handler.NewAvatarHandler(empSvc, uploader)
	bulkH := handler.NewBulkHandler(empSvc)

	// Saga orchestrator — cross-service transactions (onboarding_v1 chain).
	sagaMetrics := saga.NewMetrics(middleware.PromRegistry)
	sagaOrch := saga.NewOrchestrator(sqlDB).WithMetrics(sagaMetrics)
	onboardingDef := empsaga.Onboarding(empsaga.OnboardingSagaDeps{
		Offers: offerSvc, Employees: empSvc, Onboard: onboardingSvc,
		Careers: careerSvc, Log: logger,
	})
	offboardingDef := empsaga.Offboarding(empsaga.OffboardingSagaDeps{
		Employees: empSvc, Careers: careerSvc,
		Offboarding: offboardingSvc, Log: logger,
	})
	sagaH := handler.NewSagaHandler(sagaOrch, onboardingDef, offboardingDef)
	sagaAdminRepo := saga.NewAdminRepository(sqlDB)
	sagaAdminH := handler.NewSagaAdminHandler(sagaAdminRepo, sagaOrch, onboardingDef, offboardingDef)

	// HTTP
	scopeResolver := middleware.EmployeeResolverFunc(
		func(ctx context.Context, tid, uid uuid.UUID) (uuid.UUID, error) {
			e, err := empRepo.GetByUserID(ctx, tid, uid)
			if err != nil {
				return uuid.Nil, err
			}
			return e.ID, nil
		},
	)
	r := newRouter(cfg, logger, authChecker, scopeResolver, empSvc, searchSvc, importSvc, historySvc, contactSvc, offerSvc, onboardingSvc, careerSvc, compSvc, relatedSvc, positionSvc, offboardingSvc, outboxAdminH, sagaH, sagaAdminH, offerPDFH, esignH, avatarH, bulkH)

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
	scopeResolver middleware.EmployeeResolver,
	empSvc *service.EmployeeService,
	searchSvc *service.SearchService,
	importSvc *service.ImportService,
	historySvc *service.HistoryService,
	contactSvc *service.ContactService,
	offerSvc *service.OfferService,
	onboardingSvc *service.OnboardingService,
	careerSvc *service.CareerService,
	compSvc *service.CompensationService,
	relatedSvc *service.RelatedContactService,
	positionSvc *service.PositionService,
	offboardingSvc *service.OffboardingService,
	outboxAdminH *handler.OutboxAdminHandler,
	sagaH *handler.SagaHandler,
	sagaAdminH *handler.SagaAdminHandler,
	offerPDFH *handler.OfferPDFHandler,
	esignH *handler.ESignWebhookHandler,
	avatarH *handler.AvatarHandler,
	bulkH *handler.BulkHandler,
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
	r.Use(middleware.Tracing("employee"))
	r.Use(middleware.Metrics)
	r.Use(middleware.TenantInjector)
	if scopeResolver != nil {
		r.Use(middleware.ResolveEmployeeScope(scopeResolver))
	}

	dep := handler.Dependencies{Log: logger, Validator: handler.NewValidator()}

	empH := handler.NewEmployeeHandler(empSvc, dep)
	searchH := handler.NewSearchHandler(searchSvc)
	importH := handler.NewImportHandler(importSvc, cfg.ImportMaxFileMB)
	historyH := handler.NewHistoryHandler(historySvc)
	contactH := handler.NewContactHandler(contactSvc)
	offerH := handler.NewOfferHandler(offerSvc)
	onboardingH := handler.NewOnboardingHandler(onboardingSvc)
	careerH := handler.NewCareerHandler(careerSvc)
	compH := handler.NewCompensationHandler(compSvc)
	relatedH := handler.NewRelatedContactHandler(relatedSvc)
	positionH := handler.NewPositionHandler(positionSvc)
	offboardingH := handler.NewOffboardingHandler(offboardingSvc)

	// Health + observability
	r.Get("/health", healthHandler)
	r.Get("/ready", readyHandler)
	r.Method(http.MethodGet, "/metrics", middleware.MetricsHandler())

	// Authenticated endpoints
	r.Route("/api/v1", func(r chi.Router) {
		r.Use(middleware.RequireAuth(checker))
		r.Route("/employees", func(r chi.Router) {
			r.Get("/", empH.List)
			r.Post("/", empH.Create)
			r.Get("/search", searchH.Search)
			r.Get("/me", empH.GetMe)
			r.Post("/import", importH.Import)
			// Two-phase import used by the onboarding wizard Step 4.
			r.Post("/import/validate", importH.Validate)
			r.Post("/import/commit", importH.Commit)
			// Bulk operations (admin only).
			r.With(middleware.RequireRole("admin", "hr_admin", "hr_director", "cxo")).Post("/bulk-status", bulkH.BulkStatus)
			r.With(middleware.RequireRole("admin", "hr_admin", "hr_director", "cxo")).Post("/mass-email", bulkH.MassEmail)
			r.Route("/{id}", func(r chi.Router) {
				r.Get("/", empH.Get)
				r.Patch("/", empH.Patch)
				r.Delete("/", empH.Delete)
				r.Post("/terminate", empH.Terminate)
				r.Post("/reinstate", empH.Reinstate)
				// Avatar upload + delete.
				if avatarH != nil {
					r.Post("/avatar", avatarH.Upload)
					r.Delete("/avatar", avatarH.Delete)
				}
				// Saga: terminate → career termination → offboarding checklist + exit interview
				r.Post("/offboard", sagaH.TriggerOffboarding)
				r.Get("/history", historyH.List)
				r.Post("/history", historyH.Append)
				r.Get("/contacts", contactH.List)
				r.Post("/contacts", contactH.Create)
				r.Patch("/contacts/{cid}", contactH.Patch)
				r.Delete("/contacts/{cid}", contactH.Delete)
				r.Get("/onboarding", onboardingH.GetForEmployee)
				r.Post("/onboarding", onboardingH.Start)
				r.Get("/career", careerH.Timeline)
				r.Post("/career", careerH.Append)
				r.Get("/compensation", compH.History)
				r.Post("/compensation", compH.Create)
				r.Get("/related-contacts", relatedH.List)
				r.Post("/related-contacts", relatedH.Create)
				r.Get("/positions", positionH.List)
				r.Post("/positions", positionH.Create)
				r.Get("/offboarding", offboardingH.GetForEmployee)
				r.Post("/offboarding", offboardingH.Start)
			})
		})
		r.Route("/related-contacts", func(r chi.Router) {
			r.Patch("/{id}", relatedH.Patch)
			r.Delete("/{id}", relatedH.Delete)
		})
		r.Route("/employee-positions", func(r chi.Router) {
			r.Patch("/{id}", positionH.Patch)
			r.Post("/{id}/end", positionH.End)
		})
		r.Route("/offboarding", func(r chi.Router) {
			r.Get("/{id}", offboardingH.Get)
			r.Patch("/{id}", offboardingH.Patch)
			r.Get("/{id}/exit-interview", offboardingH.GetExitInterview)
			r.Post("/{id}/exit-interview", offboardingH.SubmitExitInterview)
		})
		r.Route("/onboarding", func(r chi.Router) {
			r.Get("/", onboardingH.List)
			r.Get("/templates", onboardingH.Templates)
			r.Get("/{id}", onboardingH.Get)
			r.Patch("/tasks/{taskId}", onboardingH.PatchTask)
		})
		// Transactional outbox DLQ admin — hr_admin/cxo/admin yetkisi.
		r.Route("/outbox", func(r chi.Router) {
			r.Use(middleware.RequireRole("hr_admin", "hr_director", "cxo", "admin"))
			r.Get("/stats", outboxAdminH.Stats)
			r.Get("/dlq", outboxAdminH.ListDLQ)
			r.Post("/{id}/replay", outboxAdminH.Replay)
		})

		// Saga orchestrator admin — same admin role gate.
		r.Route("/saga", func(r chi.Router) {
			r.Use(middleware.RequireRole("hr_admin", "hr_director", "cxo", "admin"))
			r.Get("/stats", sagaAdminH.Stats)
			r.Get("/", sagaAdminH.List)
			r.Get("/{id}", sagaAdminH.Get)
			r.Post("/{id}/retry", sagaAdminH.Retry)
			r.Post("/{id}/cancel", sagaAdminH.Cancel)
		})

		r.Route("/offers", func(r chi.Router) {
			r.Get("/", offerH.List)
			r.Post("/", offerH.Create)
			r.Route("/{id}", func(r chi.Router) {
				r.Get("/", offerH.Get)
				r.Post("/send", offerH.Send)
				r.Post("/view", offerH.View)
				r.Post("/accept", offerH.Accept)
				r.Post("/decline", offerH.Decline)
				r.Post("/revoke", offerH.Revoke)
				// PDF teklif mektubu
				r.Get("/pdf", offerPDFH.Download)
				// E-imza provider webhook callback (DocuSign / KEP / Adobe Sign)
				r.Post("/esign-callback", esignH.Handle)
				// Saga: accept offer → create employee → onboard → career event
				r.Post("/onboard", sagaH.TriggerOnboarding)
			})
		})
	})

	return r
}

func getenvDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
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
