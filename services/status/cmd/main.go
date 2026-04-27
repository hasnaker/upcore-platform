// Command main runs the status service.
//
// Responsibilities:
//  1. Serve the public /api/v2 surface consumed by apps/status and external
//     monitoring clients (Atlassian Statuspage compatible).
//  2. Serve the /api/v1/admin/status surface consumed by apps/admin.
//  3. Run the 1-minute sync worker that pulls from Prometheus and /health
//     endpoints to keep component state fresh.
//
// Env:
//
//	DATABASE_URL       — Postgres DSN
//	PORT               — HTTP listen port (default 8030)
//	PROMETHEUS_URL     — base URL (default http://prometheus:9090)
//	PUBLIC_BASE_URL    — status page base URL (default https://status.upcore.io)
//	POSTMARK_TOKEN     — if set, subscriber confirmation emails are sent
//	AZURE_WEBHOOK_SECRET — shared secret for the Azure Monitor webhook
//	SYNC_DISABLED      — set to "true" to skip the sync worker (test mode)
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
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"github.com/upcore/status/internal/handler"
	"github.com/upcore/status/internal/prometheus"
	"github.com/upcore/status/internal/service"
	"github.com/upcore/status/internal/subscriber"
	syncpkg "github.com/upcore/status/internal/sync"
)

func main() {
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	logger := log.With().Str("service", "status").Logger()

	dsn := getenv("DATABASE_URL", "postgresql://upcore:upcore_dev_password@localhost:5432/upcore_dev?sslmode=disable")
	port := getenv("PORT", "8030")
	promURL := getenv("PROMETHEUS_URL", "http://prometheus:9090")
	publicBaseURL := getenv("PUBLIC_BASE_URL", "https://status.upcore.io")
	azureSecret := os.Getenv("AZURE_WEBHOOK_SECRET")

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	db, err := sqlx.ConnectContext(ctx, "postgres", dsn)
	if err != nil {
		logger.Fatal().Err(err).Msg("db connect")
	}
	defer func() { _ = db.Close() }()
	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(3)
	db.SetConnMaxLifetime(30 * time.Minute)

	svc := service.New(db, logger)
	mailer := subscriber.NewPostmark()
	h := handler.New(db, svc, handler.Config{
		PublicBaseURL: publicBaseURL,
		AzureSecret:   azureSecret,
		Mailer:        mailer,
	})

	r := chi.NewRouter()
	r.Use(requestLogger(logger))
	r.Get("/health", healthHandler)
	r.Get("/ready", readyHandler(db))
	r.Route("/api/v2", h.RegisterPublic)
	r.Route("/api/v1/admin/status", h.RegisterAdmin)
	r.Route("/webhooks", h.RegisterWebhooks)

	if os.Getenv("SYNC_DISABLED") != "true" {
		worker := syncpkg.NewWorker(svc, prometheus.NewClient(promURL), logger)
		go worker.Run(ctx)
	}

	srv := &http.Server{
		Addr:              ":" + port,
		Handler:           r,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      60 * time.Second,
		IdleTimeout:       90 * time.Second,
	}

	errCh := make(chan error, 1)
	go func() {
		logger.Info().Str("addr", srv.Addr).Msg("status service starting")
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
		}
	}()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, os.Interrupt, syscall.SIGTERM)
	select {
	case <-sigCh:
	case err := <-errCh:
		logger.Error().Err(err).Msg("server error")
	}

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()
	_ = srv.Shutdown(shutdownCtx)
}

func getenv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func healthHandler(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"status":"ok","service":"status"}`))
}

func readyHandler(db *sqlx.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer cancel()
		if err := db.PingContext(ctx); err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusServiceUnavailable)
			_, _ = w.Write([]byte(`{"status":"db_unavailable","service":"status"}`))
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ready","service":"status"}`))
	}
}

func requestLogger(logger zerolog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			next.ServeHTTP(w, r)
			logger.Debug().
				Str("method", r.Method).
				Str("path", r.URL.Path).
				Dur("dur", time.Since(start)).
				Msg("http")
		})
	}
}
