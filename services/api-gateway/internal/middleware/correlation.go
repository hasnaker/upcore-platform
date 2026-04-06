package middleware

import (
	"context"
	"net/http"

	"github.com/google/uuid"
)

type contextKey string

const correlationIDKey contextKey = "correlation_id"

// CorrelationHeader is the HTTP header name for the correlation ID.
const CorrelationHeader = "X-Correlation-Id"

// CorrelationMiddleware reads or generates a correlation ID (UUIDv7 when available,
// UUIDv4 otherwise) and propagates it downstream and in the response.
func CorrelationMiddleware() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			correlationID := r.Header.Get(CorrelationHeader)
			if correlationID == "" {
				id, err := uuid.NewV7()
				if err != nil {
					id = uuid.New()
				}
				correlationID = id.String()
			}

			// Set on request headers for downstream propagation
			r.Header.Set(CorrelationHeader, correlationID)

			// Set on response headers
			w.Header().Set(CorrelationHeader, correlationID)

			// Store in context
			ctx := context.WithValue(r.Context(), correlationIDKey, correlationID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// CorrelationID extracts the correlation ID from the context.
func CorrelationID(ctx context.Context) string {
	if id, ok := ctx.Value(correlationIDKey).(string); ok {
		return id
	}
	return ""
}
