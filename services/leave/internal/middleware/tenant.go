package middleware

import (
	"net/http"
	"time"

	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/rs/zerolog"
)

// RequestLogger logs HTTP requests using zerolog.
func RequestLogger(log zerolog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			ww := chimw.NewWrapResponseWriter(w, r.ProtoMajor)
			reqID := chimw.GetReqID(r.Context())
			defer func() {
				dur := time.Since(start)
				log.Info().
					Str("request_id", reqID).
					Str("method", r.Method).
					Str("path", r.URL.Path).
					Int("status", ww.Status()).
					Int("bytes", ww.BytesWritten()).
					Dur("duration", dur).
					Str("remote", r.RemoteAddr).
					Msg("http request")
			}()
			next.ServeHTTP(ww, r)
		})
	}
}

// TenantScope ensures that every authenticated request carries a tenant ID.
// It must be mounted AFTER RequireAuth. It is a no-op in terms of scoping (the
// actual scoping happens via RLS + explicit tenant_id filters in repositories)
// but it guards the downstream handlers from zero-UUID leaks.
func TenantScope(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if TenantIDFromContext(r.Context()).String() == "00000000-0000-0000-0000-000000000000" {
			http.Error(w, `{"error":"tenant_scope_missing"}`, http.StatusUnauthorized)
			return
		}
		next.ServeHTTP(w, r)
	})
}
