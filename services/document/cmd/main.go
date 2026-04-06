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

	"github.com/upcore/document/internal/config"
	"github.com/upcore/document/internal/db"
	"github.com/upcore/document/internal/domain"
	"github.com/upcore/document/internal/esignature"
	"github.com/upcore/document/internal/event"
	"github.com/upcore/document/internal/handler"
	"github.com/upcore/document/internal/middleware"
	"github.com/upcore/document/internal/repository"
	"github.com/upcore/document/internal/service"
	"github.com/upcore/document/internal/storage"
)

func main() {
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	logger := log.With().Str("service", "document").Logger()

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

	// Blob client: Azure in production, in-memory fallback for local dev.
	var blobClient storage.BlobClient
	if cfg.BlobAccountName != "" && cfg.BlobAccountKey != "" {
		az, err := storage.NewAzureBlobClient(cfg.BlobAccountName, cfg.BlobAccountKey, cfg.BlobEndpoint)
		if err != nil {
			logger.Fatal().Err(err).Msg("azure blob client")
		}
		if err := az.EnsureContainer(ctx, cfg.BlobContainer); err != nil {
			logger.Warn().Err(err).Str("container", cfg.BlobContainer).Msg("ensure container")
		}
		blobClient = az
		logger.Info().Str("container", cfg.BlobContainer).Msg("azure blob storage connected")
	} else {
		blobClient = storage.NewMemoryBlobClient()
		logger.Warn().Msg("AZURE_BLOB_* not configured — using in-memory blob store (dev only)")
	}

	publisher := event.NewNopPublisher(logger)
	defer func() { _ = publisher.Close() }()

	docRepo := repository.NewDocumentRepository(sqlDB)
	verRepo := repository.NewVersionRepository(sqlDB)

	deps := service.Deps{
		Docs: docRepo, Versions: verRepo, Blob: blobClient, Publisher: publisher,
		Scanner:     service.NopScanner{},
		Container:   cfg.BlobContainer,
		MaxBytes:    cfg.MaxUploadBytes(),
		SASReadTTL:  time.Duration(cfg.SASReadTTLMin) * time.Minute,
		SASWriteTTL: time.Duration(cfg.SASWriteTTLMin) * time.Minute,
		Log:         logger,
	}
	docSvc := service.NewDocumentService(deps)
	verSvc := service.NewVersionService(deps)
	expSvc := service.NewExpiryService(docRepo, publisher, cfg.ExpiryAlertDays, logger)

	providers := map[domain.SignProvider]esignature.ESignatureProvider{
		domain.SignProviderEImzala: esignature.NewEImzalaProvider(cfg.EImzalaAPIKey, cfg.EImzalaBaseURL),
		domain.SignProviderKamuSM:  esignature.NewKamuSMProvider(cfg.KamuSMAPIKey),
		domain.SignProviderEDevlet: esignature.NewEDevletProvider(cfg.EDevletClientID),
		domain.SignProviderMobile:  esignature.NewMobileSignatureProvider(),
	}
	sigSvc := service.NewSignatureService(service.SignatureServiceDeps{
		Docs: docRepo, Versions: verRepo, Blob: blobClient, Publisher: publisher,
		Providers: providers, Container: cfg.BlobContainer, Log: logger,
	})

	// Daily expiry scan.
	go runExpiryCron(ctx, expSvc, logger)

	r := newRouter(cfg, logger, docSvc, verSvc, sigSvc, expSvc)

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
	docSvc *service.DocumentService,
	verSvc *service.VersionService,
	sigSvc *service.SignatureService,
	expSvc *service.ExpiryService,
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
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Tenant-ID", "X-User-ID", "X-User-Role"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	dep := handler.Dependencies{Log: logger, Validator: handler.NewValidator()}
	maxBytes := cfg.MaxUploadBytes()
	docH := handler.NewDocumentHandler(docSvc, dep)
	upH := handler.NewUploadHandler(docSvc, maxBytes, dep)
	dlH := handler.NewDownloadHandler(docSvc, dep)
	verH := handler.NewVersionHandler(verSvc, maxBytes, dep)
	sigH := handler.NewSignatureHandler(sigSvc, dep)
	expH := handler.NewExpiryHandler(expSvc, dep)

	// Public
	r.Get("/health", healthHandler)
	r.Get("/ready", healthHandler)

	// Authenticated
	r.Group(func(r chi.Router) {
		r.Use(middleware.RequireAuth)
		r.Route("/api/v1/documents", func(r chi.Router) {
			r.Get("/", docH.List)
			r.Post("/", upH.Post)
			r.Get("/expiring", expH.List)
			r.Post("/expiring/notify", expH.Notify)
			r.Get("/{id}", docH.Get)
			r.Patch("/{id}", docH.Patch)
			r.Delete("/{id}", docH.Delete)
			r.Get("/{id}/download", dlH.Get)
			r.Get("/{id}/versions", verH.List)
			r.Post("/{id}/versions", verH.Create)
			r.Get("/{id}/versions/{version}/download", verH.Download)
			r.Post("/{id}/versions/{version}/restore", verH.Restore)
			r.Post("/{id}/signature", sigH.Initiate)
			r.Get("/{id}/signature/status", sigH.Status)
		})
		r.Delete("/api/v1/signatures/{id}", sigH.Cancel)
	})

	return r
}

func healthHandler(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"status":"ok","service":"document"}`))
}

func runExpiryCron(ctx context.Context, svc *service.ExpiryService, logger zerolog.Logger) {
	t := time.NewTicker(24 * time.Hour)
	defer t.Stop()
	// Initial sweep after 1 minute.
	firstTick := time.NewTimer(1 * time.Minute)
	defer firstTick.Stop()

	run := func() {
		n, err := svc.ScanAndNotify(ctx)
		if err != nil {
			logger.Error().Err(err).Msg("expiry scan failed")
			return
		}
		logger.Info().Int("events_emitted", n).Msg("expiry scan complete")
	}

	for {
		select {
		case <-ctx.Done():
			return
		case <-firstTick.C:
			run()
		case <-t.C:
			run()
		}
	}
}
