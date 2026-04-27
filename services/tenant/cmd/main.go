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
	"github.com/jmoiron/sqlx"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"github.com/upcore/tenant/internal/config"
	"github.com/upcore/tenant/internal/db"
	"github.com/upcore/tenant/internal/event"
	"github.com/upcore/tenant/internal/handler"
	"github.com/upcore/tenant/internal/middleware"
	"github.com/upcore/tenant/internal/repository"
	"github.com/upcore/tenant/internal/service"
)

func main() {
	// Logger setup
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	logger := log.With().Str("service", "tenant").Logger()

	cfg, err := config.Load()
	if err != nil {
		logger.Fatal().Err(err).Msg("load config")
	}
	lvl, err := zerolog.ParseLevel(cfg.LogLevel)
	if err == nil {
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
	tenantRepo := repository.NewTenantRepository(sqlDB)
	planRepo := repository.NewPlanRepository(sqlDB)
	subRepo := repository.NewSubscriptionRepository(sqlDB)
	usageRepo := repository.NewUsageRepository(sqlDB)
	draftRepo := repository.NewOnboardingDraftRepository(sqlDB)

	// Services
	txRunner := &service.SQLTxRunner{DB: sqlDB}
	tenantSvc := service.NewTenantService(txRunner, tenantRepo, planRepo, subRepo, usageRepo, publisher, cfg.TrialDays, logger)
	subSvc := service.NewSubscriptionService(planRepo, subRepo, publisher, logger)
	usageSvc := service.NewUsageService(usageRepo, subRepo, planRepo, publisher, logger)
	billingSvc := service.NewBillingService(subRepo, planRepo, tenantRepo, usageRepo, publisher, logger)
	onboardingSvc := service.NewOnboardingService(txRunner, draftRepo, tenantRepo, planRepo, subRepo, usageRepo, publisher, cfg.TrialDays, logger)

	// HTTP
	r := newRouter(cfg, logger, tenantSvc, subSvc, usageSvc, billingSvc, onboardingSvc, planRepo, sqlDB)

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
	tenantSvc *service.TenantService,
	subSvc *service.SubscriptionService,
	usageSvc *service.UsageService,
	billingSvc *service.BillingService,
	onboardingSvc *service.OnboardingService,
	planRepo repository.PlanRepository,
	sqlDB *sqlx.DB,
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
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Tenant-ID", "X-User-ID", "X-User-Role", "X-Signature"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	dep := handler.Dependencies{Log: logger, Validator: handler.NewValidator()}

	signupH := handler.NewSignupHandler(tenantSvc, dep)
	tenantH := handler.NewTenantHandler(tenantSvc, dep)
	planH := handler.NewPlanHandler(planRepo, dep)
	subH := handler.NewSubscriptionHandler(subSvc, dep)
	usageH := handler.NewUsageHandler(usageSvc, dep)
	billingH := handler.NewBillingHandler(billingSvc, cfg.StripeWebhookSecret, cfg.IyzicoWebhookSecret, dep)
	modulesH := handler.NewModulesHandler(subSvc)
	onboardingH := handler.NewOnboardingHandler(onboardingSvc, dep)

	// Public
	r.Get("/health", healthHandler)
	r.Post("/signup", signupH.Post)
	r.Get("/plans", planH.List)
	r.Get("/plans/{id}", planH.Get)
	r.Post("/webhooks/billing", billingH.HandleWebhook)

	// Onboarding wizard (pre-tenant): authenticated by Clerk user id header,
	// since no tenant exists yet.
	r.Get("/onboarding/progress", onboardingH.Get)
	r.Post("/onboarding/progress/{step}", onboardingH.SaveStep)
	r.Post("/onboarding/commit", onboardingH.Commit)
	r.Post("/onboarding/abandon", onboardingH.Abandon)

	// Admin endpoints (webhooks + api-keys + feature-flags + export + impersonation).
	adminH := handler.NewAdminHandler(sqlDB)
	adminTenantsH := handler.NewAdminTenantsHandler(tenantSvc, dep)

	// Authenticated
	r.Group(func(r chi.Router) {
		r.Use(middleware.RequireAuth)
		adminH.Register(r)
		r.Get("/tenants/me", tenantH.GetCurrent)
		r.Get("/tenants/me/modules", modulesH.GetForCurrent)
		r.Get("/tenants/{id}", tenantH.Get)
		r.Patch("/tenants/{id}", tenantH.Patch)
		r.Delete("/tenants/{id}", tenantH.Delete)
		r.Get("/subscriptions/current", subH.GetCurrent)
		r.Post("/subscriptions", subH.ChangePlan)
		r.Post("/subscriptions/cancel", subH.Cancel)
		r.Post("/subscriptions/resume", subH.Resume)
		r.Patch("/subscriptions/seats", subH.UpdateSeats)
		r.Get("/usage", usageH.GetCurrent)

		// Platform-admin only: tenant management across the whole platform.
		r.Route("/admin", func(r chi.Router) {
			r.Use(middleware.RequirePlatformAdmin)
			adminTenantsH.Register(r)
			r.Get("/onboarding/funnel", onboardingH.Funnel)
		})
	})

	return r
}

func healthHandler(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"status":"ok","service":"tenant"}`))
}
