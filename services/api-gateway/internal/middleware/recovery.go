package middleware

import (
	"encoding/json"
	"net/http"
	"runtime/debug"

	"github.com/rs/zerolog"
)

// RecoveryMiddleware catches panics, logs the stack trace, and returns a 500
// response instead of crashing the process.
func RecoveryMiddleware(logger zerolog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				if rvr := recover(); rvr != nil {
					stack := string(debug.Stack())
					correlationID := CorrelationID(r.Context())

					logger.Error().
						Interface("panic", rvr).
						Str("stack", stack).
						Str("method", r.Method).
						Str("path", r.URL.Path).
						Str("correlation_id", correlationID).
						Msg("panic recovered")

					w.Header().Set("Content-Type", "application/json; charset=utf-8")
					w.WriteHeader(http.StatusInternalServerError)
					_ = json.NewEncoder(w).Encode(map[string]string{
						"error":   "internal_server_error",
						"message": "an unexpected error occurred",
					})
				}
			}()

			next.ServeHTTP(w, r)
		})
	}
}
