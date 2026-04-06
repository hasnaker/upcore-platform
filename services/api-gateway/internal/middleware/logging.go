package middleware

import (
	"net/http"
	"time"

	"github.com/rs/zerolog"
)

// statusRecorder wraps http.ResponseWriter to capture the status code and size.
type statusRecorder struct {
	http.ResponseWriter
	status int
	size   int
}

func (s *statusRecorder) WriteHeader(code int) {
	s.status = code
	s.ResponseWriter.WriteHeader(code)
}

func (s *statusRecorder) Write(b []byte) (int, error) {
	if s.status == 0 {
		s.status = http.StatusOK
	}
	n, err := s.ResponseWriter.Write(b)
	s.size += n
	return n, err
}

func (s *statusRecorder) Flush() {
	if f, ok := s.ResponseWriter.(http.Flusher); ok {
		f.Flush()
	}
}

// LoggingMiddleware produces structured access logs for every request.
func LoggingMiddleware(logger zerolog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			rec := &statusRecorder{ResponseWriter: w}

			next.ServeHTTP(rec, r)

			duration := time.Since(start)
			correlationID := CorrelationID(r.Context())
			tenantID := TenantIDFromContext(r.Context())
			userID := UserIDFromContext(r.Context())

			event := logger.Info()
			if rec.status >= 500 {
				event = logger.Error()
			} else if rec.status >= 400 {
				event = logger.Warn()
			}

			event.
				Str("method", r.Method).
				Str("path", r.URL.Path).
				Str("query", r.URL.RawQuery).
				Int("status", rec.status).
				Int("size", rec.size).
				Dur("duration_ms", duration).
				Str("remote_addr", r.RemoteAddr).
				Str("user_agent", r.UserAgent()).
				Str("correlation_id", correlationID).
				Str("tenant_id", tenantID).
				Str("user_id", userID).
				Msg("request")
		})
	}
}
