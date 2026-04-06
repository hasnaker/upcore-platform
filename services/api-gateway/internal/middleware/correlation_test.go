package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCorrelationMiddleware_GeneratesID(t *testing.T) {
	handler := CorrelationMiddleware()(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := CorrelationID(r.Context())
		assert.NotEmpty(t, id)

		// Should also be on the request header for downstream
		assert.Equal(t, id, r.Header.Get(CorrelationHeader))

		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	// Should be in response header
	assert.NotEmpty(t, rec.Header().Get(CorrelationHeader))
}

func TestCorrelationMiddleware_PreservesExisting(t *testing.T) {
	existingID := "existing-correlation-id-12345"

	handler := CorrelationMiddleware()(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := CorrelationID(r.Context())
		assert.Equal(t, existingID, id)
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set(CorrelationHeader, existingID)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	assert.Equal(t, existingID, rec.Header().Get(CorrelationHeader))
}

func TestCorrelationID_EmptyContext(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	id := CorrelationID(req.Context())
	assert.Empty(t, id)
}

func TestCorrelationMiddleware_UniquePerRequest(t *testing.T) {
	var ids []string

	handler := CorrelationMiddleware()(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ids = append(ids, CorrelationID(r.Context()))
		w.WriteHeader(http.StatusOK)
	}))

	for i := 0; i < 10; i++ {
		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
	}

	require.Len(t, ids, 10)
	// All IDs should be unique
	seen := make(map[string]bool)
	for _, id := range ids {
		assert.False(t, seen[id], "duplicate correlation ID: %s", id)
		seen[id] = true
	}
}
