// Package middleware provides HTTP middleware for the performance service.
package middleware

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"
)

// ContextKey typed key for ctx values.
type ContextKey string

const (
	// CtxTenantID holds the tenant UUID.
	CtxTenantID ContextKey = "tenant_id"
	// CtxUserID holds the authenticated user UUID.
	CtxUserID ContextKey = "user_id"
	// CtxRole holds the user role string.
	CtxRole ContextKey = "role"
)

// RequestLogger logs method, path, status, duration.
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

// TenantInjector reads X-Tenant-ID / X-User-ID / X-User-Role and puts them in ctx.
func TenantInjector(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		if v := strings.TrimSpace(r.Header.Get("X-Tenant-ID")); v != "" {
			if id, err := uuid.Parse(v); err == nil {
				ctx = context.WithValue(ctx, CtxTenantID, id)
			}
		}
		if v := strings.TrimSpace(r.Header.Get("X-User-ID")); v != "" {
			if id, err := uuid.Parse(v); err == nil {
				ctx = context.WithValue(ctx, CtxUserID, id)
			}
		}
		if v := strings.TrimSpace(r.Header.Get("X-User-Role")); v != "" {
			ctx = context.WithValue(ctx, CtxRole, v)
		}
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// RequireTenant aborts with 401 when tenant is missing.
func RequireTenant(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if TenantID(r.Context()) == uuid.Nil {
			writeJSON(w, http.StatusUnauthorized, map[string]any{"error": "unauthorized", "message": "tenant context required"})
			return
		}
		next.ServeHTTP(w, r)
	})
}

// TenantID extracts tenant from ctx, or uuid.Nil.
func TenantID(ctx context.Context) uuid.UUID {
	if v, ok := ctx.Value(CtxTenantID).(uuid.UUID); ok {
		return v
	}
	return uuid.Nil
}

// UserID extracts user id from ctx, or uuid.Nil.
func UserID(ctx context.Context) uuid.UUID {
	if v, ok := ctx.Value(CtxUserID).(uuid.UUID); ok {
		return v
	}
	return uuid.Nil
}

// Role extracts role string from ctx.
func Role(ctx context.Context) string {
	if v, ok := ctx.Value(CtxRole).(string); ok {
		return v
	}
	return ""
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
