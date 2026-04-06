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

	"github.com/upcore/notification/internal/channels"
	"github.com/upcore/notification/internal/config"
	"github.com/upcore/notification/internal/db"
	"github.com/upcore/notification/internal/event"
	"github.com/upcore/notification/internal/handler"
	"github.com/upcore/notification/internal/middleware"
	"github.com/upcore/notification/internal/repository"
	"github.com/upcore/notification/internal/service"
)

func main() {
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	logger := log.With().Str("service", "notification").Logger()

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

	// Run migrations
	if err := db.RunMigrations(ctx, sqlDB, "migrations"); err != nil {
		logger.Warn().Err(err).Msg("run migrations (non-fatal)")
	}

	// Event publisher (no-op until Service Bus is wired)
	publisher := event.NewNopPublisher(logger)
	defer func() { _ = publisher.Close() }()

	// Repositories
	tmplRepo := repository.NewTemplateRepository(sqlDB)
	notifRepo := repository.NewNotificationRepository(sqlDB)
	prefRepo := repository.NewPreferenceRepository(sqlDB)
	inappRepo := repository.NewInAppRepository(sqlDB)
	suppRepo := repository.NewSuppressionRepository(sqlDB)

	// Services
	renderer := service.NewRenderer()
	tmplSvc := service.NewTemplateService(tmplRepo, renderer, logger)
	prefSvc := service.NewPreferenceService(prefRepo, logger)
	inappSvc := service.NewInAppService(inappRepo, logger)

	// Channel drivers
	var channelDrivers []channels.Channel

	// SendGrid (email)
	if cfg.HasSendGrid() {
		sg := channels.NewSendGridChannel(cfg.SendGridAPIKey, cfg.SendGridFromEmail, cfg.SendGridFromName, logger)
		channelDrivers = append(channelDrivers, sg)
		logger.Info().Msg("SendGrid email channel enabled")
	} else {
		logger.Warn().Msg("SendGrid not configured; email delivery disabled")
	}

	// In-app channel
	inappCh := channels.NewInAppChannel(inappRepo, logger)
	channelDrivers = append(channelDrivers, inappCh)

	// Dispatcher
	dispatcher := service.NewDispatcher(
		notifRepo, prefRepo, suppRepo, tmplSvc, publisher,
		channelDrivers, cfg.BounceSuppressAt, logger,
	)

	// Workers
	retryWorker := service.NewRetryWorker(notifRepo, dispatcher, cfg.MaxRetries, logger)
	go func() {
		if err := retryWorker.Run(ctx); err != nil && !errors.Is(err, context.Canceled) {
			logger.Error().Err(err).Msg("retry worker error")
		}
	}()

	digestWorker := service.NewDigestWorker(notifRepo, prefRepo, logger)
	go func() {
		if err := digestWorker.Run(ctx); err != nil && !errors.Is(err, context.Canceled) {
			logger.Error().Err(err).Msg("digest worker error")
		}
	}()

	// Auth checker
	authChecker := middleware.NewAuthChecker("http://localhost:8001", 500*time.Millisecond)

	// HTTP router
	r := newRouter(cfg, logger, authChecker, tmplSvc, dispatcher, prefSvc, inappSvc, notifRepo, suppRepo)

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
		logger.Info().Str("addr", srv.Addr).Msg("notification service listening")
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
	logger.Info().Msg("notification service stopped")
}

func newRouter(
	cfg *config.Config,
	logger zerolog.Logger,
	checker *middleware.AuthChecker,
	tmplSvc *service.TemplateService,
	dispatcher *service.Dispatcher,
	prefSvc *service.PreferenceService,
	inappSvc *service.InAppService,
	notifRepo repository.NotificationRepository,
	suppRepo repository.SuppressionRepository,
) http.Handler {
	r := chi.NewRouter()
	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(chimw.StripSlashes)
	r.Use(chimw.Recoverer)
	r.Use(chimw.Timeout(cfg.RequestTimeout))
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   cfg.CORSAllowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Tenant-ID", "X-User-ID", "X-User-Role"},
		AllowCredentials: true,
		MaxAge:           300,
	}))
	r.Use(middleware.TenantInjector)

	tmplH := handler.NewTemplateHandler(tmplSvc)
	notifH := handler.NewNotificationHandler(dispatcher, notifRepo)
	prefH := handler.NewPreferenceHandler(prefSvc)
	inappH := handler.NewInAppHandler(inappSvc)
	webhookH := handler.NewWebhookHandler(notifRepo, suppRepo, cfg.SendGridWebhookKey, cfg.BounceSuppressAt, logger)

	// Health
	r.Get("/health", healthHandler)
	r.Get("/ready", readyHandler)

	// Webhooks (no auth -- verified by provider signature)
	r.Post("/webhooks/sendgrid", webhookH.PostSendGridWebhook)
	r.Post("/webhooks/netgsm", webhookH.PostNetgsmWebhook)

	// Authenticated API
	r.Route("/api/v1/notifications", func(r chi.Router) {
		r.Use(middleware.RequireAuth(checker))

		// Templates
		r.Get("/templates", tmplH.List)
		r.Get("/templates/{code}", tmplH.GetByCode)
		r.Post("/templates", tmplH.Create)
		r.Patch("/templates/{id}", tmplH.Update)
		r.Post("/templates/{id}/activate", tmplH.Activate)
		r.Post("/templates/{id}/deactivate", tmplH.Deactivate)

		// Send
		r.Post("/send", notifH.Send)
		r.Post("/send-bulk", notifH.SendBulk)

		// My notifications
		r.Get("/mine", notifH.ListMine)
		r.Get("/{id}", notifH.GetByID)

		// In-app
		r.Get("/inapp", inappH.List)
		r.Get("/inapp/unread-count", inappH.UnreadCount)
		r.Post("/inapp/{id}/read", inappH.MarkRead)
		r.Post("/inapp/read-all", inappH.MarkAllRead)
		r.Delete("/inapp/{id}", inappH.Delete)

		// Preferences
		r.Get("/preferences/mine", prefH.GetMine)
		r.Put("/preferences/mine", prefH.UpdateMine)
		r.Post("/preferences/opt-out", prefH.OptOut)
		r.Post("/preferences/opt-in", prefH.OptIn)

		// Admin stats
		r.Get("/admin/stats", notifH.AdminStats)
	})

	return r
}

func healthHandler(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"status":"ok","service":"notification"}`))
}

func readyHandler(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"status":"ready","service":"notification"}`))
}
