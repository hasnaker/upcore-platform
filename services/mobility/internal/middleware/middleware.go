// Package middleware provides HTTP middleware for mobility service.
package middleware

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/mobility/internal/domain"
)

// RequestLogger logs each request with status + duration.
func RequestLogger(logger zerolog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			sr := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
			next.ServeHTTP(sr, r)
			logger.Info().
				Str("method", r.Method).
				Str("path", r.URL.Path).
				Int("status", sr.status).
				Dur("duration", time.Since(start)).
				Msg("http")
		})
	}
}

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (s *statusRecorder) WriteHeader(code int) {
	s.status = code
	s.ResponseWriter.WriteHeader(code)
}

// TenantInjector reads gateway-set headers (X-Tenant-Id, X-User-Id, X-User-Role)
// and puts them into request context as UUIDs / strings.
func TenantInjector(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		if v := strings.TrimSpace(r.Header.Get("X-Tenant-ID")); v != "" {
			if id, err := uuid.Parse(v); err == nil {
				ctx = context.WithValue(ctx, domain.CtxTenantID, id)
			}
		}
		if v := strings.TrimSpace(r.Header.Get("X-User-ID")); v != "" {
			if id, err := uuid.Parse(v); err == nil {
				ctx = context.WithValue(ctx, domain.CtxUserID, id)
			}
		}
		if v := strings.TrimSpace(r.Header.Get("X-User-Role")); v != "" {
			ctx = context.WithValue(ctx, domain.CtxRole, v)
		}
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// RequireTenant rejects requests missing a tenant context with 401.
func RequireTenant(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if _, ok := TenantID(r.Context()); !ok {
			writeJSONError(w, http.StatusUnauthorized, "missing_tenant", "tenant context required")
			return
		}
		next.ServeHTTP(w, r)
	})
}

// TenantID reads the tenant UUID from context.
func TenantID(ctx context.Context) (uuid.UUID, bool) {
	v, ok := ctx.Value(domain.CtxTenantID).(uuid.UUID)
	return v, ok
}

// UserID reads the user UUID from context.
func UserID(ctx context.Context) (uuid.UUID, bool) {
	v, ok := ctx.Value(domain.CtxUserID).(uuid.UUID)
	return v, ok
}

// Role reads the user role from context.
func Role(ctx context.Context) string {
	v, _ := ctx.Value(domain.CtxRole).(string)
	return v
}

func writeJSONError(w http.ResponseWriter, status int, code, message string) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]any{
		"error": map[string]string{"code": code, "message": message},
	})
}
