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

// Recoverer is a thin wrapper for chi's recoverer.
func Recoverer(next http.Handler) http.Handler {
	return chimw.Recoverer(next)
}
