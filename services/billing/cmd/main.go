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

	"github.com/upcore/billing/internal/handler"
	"github.com/upcore/billing/internal/provider"
	"github.com/upcore/billing/internal/service"
)

func main() {
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	logger := log.With().Str("service", "billing").Logger()

	dsn := getenv("DATABASE_URL", "postgresql://upcore:upcore_dev_password@localhost:5432/upcore_dev?sslmode=disable")
	port := getenv("PORT", "8026")

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	db, err := sqlx.ConnectContext(ctx, "postgres", dsn)
	if err != nil {
		logger.Fatal().Err(err).Msg("db connect")
	}
	defer func() { _ = db.Close() }()
	db.SetMaxOpenConns(15)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(30 * time.Minute)

	svc := service.NewService(db, logger)
	svc.RegisterProvider("iyzico", provider.NewIyzico())
	svc.RegisterProvider("stripe", provider.NewStripe())

	adminSvc := service.NewAdminService(svc)

	h := handler.New(db, svc)
	adminH := handler.NewAdminHandler(db, adminSvc, nil)

	r := chi.NewRouter()
	r.Use(tenantHeaderPassthrough)
	r.Get("/health", healthHandler)
	r.Get("/ready", readyHandler)
	r.Route("/api/v1", func(r chi.Router) {
		h.Register(r)
		r.Route("/admin/billing", func(r chi.Router) {
			adminH.Register(r)
		})
	})

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
		logger.Info().Str("addr", srv.Addr).Msg("billing service starting")
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

func tenantHeaderPassthrough(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Gateway zaten X-Tenant-ID header'ı set ediyor. Local testing için
		// DEV_TENANT_ID env set edilebilir.
		if r.Header.Get("X-Tenant-ID") == "" {
			if dev := os.Getenv("DEV_TENANT_ID"); dev != "" {
				r.Header.Set("X-Tenant-ID", dev)
			}
		}
		next.ServeHTTP(w, r)
	})
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
	_, _ = w.Write([]byte(`{"status":"ok","service":"billing"}`))
}

func readyHandler(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"status":"ready","service":"billing"}`))
}
